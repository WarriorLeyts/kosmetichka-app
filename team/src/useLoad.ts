import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { onLiveHint } from "./live";
import { lastWriteAt } from "./api";

/**
 * load data for a screen: first load, refresh on return to the screen, pull-to-refresh;
 * `poll` — while the screen is open and the app in front, refresh every `poll` ms (statuses, new
 * messages appear by themselves); `paused` — skip those refreshes (e.g. while the order is edited).
 */
export function useLoad<T>(
  fn: () => Promise<T>,
  deps: unknown[] = [],
  opts: {
    refocus?: boolean;
    poll?: number;
    paused?: boolean;
    /** reload at once when the site says an order changed (all orders, or only the ones this returns true for) */
    live?: boolean | ((orderId: number) => boolean);
  } = { refocus: true }
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);

  const loadedAt = useRef(0);
  const reload = useCallback(async () => {
    const my = ++seq.current;
    try {
      const d = await run();
      if (my === seq.current) {
        loadedAt.current = Date.now();
        setData(d);
        setError("");
      }
    } catch (e) {
      if (my === seq.current) setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      if (my === seq.current) setLoading(false);
    }
  }, [run]);

  useEffect(() => {
    setLoading(true);
    reload();
  }, [reload]);

  const first = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      // coming back to a screen: refresh if the data is older than 20 s (saves traffic on a slow link)
      // or something was changed meanwhile (e.g. a customer edited on the next screen)
      if (opts.refocus !== false && (Date.now() - loadedAt.current > 20_000 || lastWriteAt() > loadedAt.current)) reload();
    }, [reload, opts.refocus])
  );

  const paused = useRef(false);
  paused.current = !!opts.paused;
  useFocusEffect(
    useCallback(() => {
      if (!opts.poll) return;
      const t = setInterval(() => {
        if (AppState.currentState === "active" && !paused.current) reload();
      }, opts.poll);
      return () => clearInterval(t);
    }, [reload, opts.poll])
  );

  const liveRef = useRef(opts.live);
  liveRef.current = opts.live;
  useFocusEffect(
    useCallback(() => {
      if (!liveRef.current) return;
      let t: ReturnType<typeof setTimeout> | null = null;
      const off = onLiveHint((h) => {
        const want = liveRef.current;
        if (h.t !== "order" || !want || paused.current) return;
        if (typeof want === "function" && !want(h.id)) return;
        // several hints in a row → one reload
        if (t) clearTimeout(t);
        t = setTimeout(() => reload(), 120);
      });
      return () => {
        off();
        if (t) clearTimeout(t);
      };
    }, [reload])
  );

  return { data, error, loading, reload, setData };
}
