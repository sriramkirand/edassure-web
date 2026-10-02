import { useCallback, useEffect, useRef, useState } from "react";

/** Count up to a number once, with an ease-out curve. Respects reduced motion. */
export function useCountUp(target: number, ms = 700): number {
  const [v, setV] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || target === prev.current) { setV(target); prev.current = target; return; }
    const from = prev.current, start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      setV(Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick); else prev.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

/** Load something async with loading / error state and a reload function. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn); fnRef.current = fn;
  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try { setData(await fnRef.current()); setError(null); }
    catch (e) { setError(e as Error); }
    finally { setLoading(false); }
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void reload(); }, deps);
  return { data, error, loading, reload, setData };
}

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark" | "auto">(() => {
    try { return (localStorage.getItem("edassure_theme") as "light" | "dark" | null) ?? "auto"; } catch { return "auto"; }
  });
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "auto") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", theme);
    try { theme === "auto" ? localStorage.removeItem("edassure_theme") : localStorage.setItem("edassure_theme", theme); } catch { /* ignore */ }
  }, [theme]);
  const dark = theme === "dark" || (theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  return { dark, toggle: () => setTheme(dark ? "light" : "dark") };
}
