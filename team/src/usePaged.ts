import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { onLiveHint } from "./live";

/** offset/page based endless list with a debounced query */
export function usePaged<T>(
  fetchPage: (offset: number) => Promise<{ items: T[]; hasMore: boolean }>,
  deps: unknown[],
  /** poll: refresh the first page every N ms; live: also at once when the site says an order changed */
  opts: { poll?: number; live?: boolean } = {}
) {
  const [items, setItems] = useState<T[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const seq = useRef(0);
  const busy = useRef(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fp = useCallback(fetchPage, deps);

  const reload = useCallback(async () => {
    const my = ++seq.current;
    setError("");
    try {
      const r = await fp(0);
      if (my !== seq.current) return;
      setItems(r.items);
      setHasMore(r.hasMore);
    } catch (e) {
      if (my === seq.current) setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      if (my === seq.current) setLoading(false);
    }
  }, [fp]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(reload, 300); // debounce typing
    return () => clearTimeout(t);
  }, [reload]);

  const more = useCallback(async () => {
    if (!hasMore || busy.current || loading) return;
    busy.current = true;
    setLoadingMore(true);
    const my = seq.current;
    try {
      const r = await fp(items.length);
      if (my !== seq.current) return;
      setItems((p) => [...p, ...r.items]);
      setHasMore(r.hasMore);
    } catch {
      /* keep the list; the user can scroll again */
    } finally {
      busy.current = false;
      setLoadingMore(false);
    }
  }, [fp, hasMore, items.length, loading]);

  // while the list is open: the first page again every `poll` ms — new statuses in place, new rows on top,
  // pages already scrolled to are kept; a failed refresh changes nothing
  // the first page again — new statuses in place, new rows on top, pages already scrolled to are kept;
  // a failed refresh changes nothing
  const refreshFirst = useCallback(async () => {
    if (busy.current) return;
    const my = seq.current;
    try {
      const r = await fp(0);
      if (my !== seq.current) return;
      const key = (x: T) => (x as { id?: number }).id;
      const fresh = new Map(r.items.map((x) => [key(x), x]));
      setItems((prev) => {
        const known = new Set(prev.map(key));
        return [...r.items.filter((x) => !known.has(key(x))), ...prev.map((x) => fresh.get(key(x)) ?? x)];
      });
    } catch {
      /* keep the list */
    }
  }, [fp]);

  useFocusEffect(
    useCallback(() => {
      if (!opts.poll) return;
      const t = setInterval(() => {
        if (AppState.currentState === "active") refreshFirst();
      }, opts.poll);
      return () => clearInterval(t);
    }, [refreshFirst, opts.poll])
  );

  useFocusEffect(
    useCallback(() => {
      if (!opts.live) return;
      let t: ReturnType<typeof setTimeout> | null = null;
      const off = onLiveHint((h) => {
        if (h.t !== "order") return;
        if (t) clearTimeout(t);
        t = setTimeout(() => refreshFirst(), 150);
      });
      return () => {
        off();
        if (t) clearTimeout(t);
      };
    }, [refreshFirst, opts.live])
  );

  return { items, hasMore, loading, loadingMore, error, reload, more, setItems };
}
