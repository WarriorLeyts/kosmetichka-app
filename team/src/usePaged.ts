import { useCallback, useEffect, useRef, useState } from "react";

/** offset/page based endless list with a debounced query */
export function usePaged<T>(fetchPage: (offset: number) => Promise<{ items: T[]; hasMore: boolean }>, deps: unknown[]) {
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

  return { items, hasMore, loading, loadingMore, error, reload, more, setItems };
}
