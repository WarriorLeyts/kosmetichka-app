import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";

/** load data for a screen: first load, refresh on return to the screen, pull-to-refresh */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = [], opts: { refocus?: boolean } = { refocus: true }) {
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
      // coming back to a screen: refresh only if the data is older than 20 s (saves traffic on a slow link)
      if (opts.refocus !== false && Date.now() - loadedAt.current > 20_000) reload();
    }, [reload, opts.refocus])
  );

  return { data, error, loading, reload, setData };
}
