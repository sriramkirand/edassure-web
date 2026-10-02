import { useEffect, useState } from "react";
import type { Area, Light } from "../lib/types";

const prefersReduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const toneOf = (l: Light | null | undefined) => (l ? "tone-" + l : "tone-none");

/** Circular gauge. `value` is 0..1. Animates from empty on mount. */
export function Ring({ value, size = 88, stroke = 9, tone = "tone-brand", label, sub, glow }: { value: number | null; size?: number; stroke?: number; tone?: string; label?: string; sub?: string; glow?: boolean }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const [v, setV] = useState(0);
  useEffect(() => { const id = requestAnimationFrame(() => setV(value ?? 0)); return () => cancelAnimationFrame(id); }, [value]);
  return (
    <div className={"ring " + tone + (glow ? " ring-glow" : "")} style={{ ["--size" as string]: size + "px" } as React.CSSProperties} role="img" aria-label={label ?? (value == null ? "No result yet" : Math.round(value * 100) + "% passed")}>
      <svg viewBox={`0 0 ${size} ${size}`}>
        <circle className="track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
        <circle className="arc" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, v)))} />
      </svg>
      <div className="centre"><div><b>{label ?? (value == null ? "–" : Math.round(value * 100) + "%")}</b>{sub && <small>{sub}</small>}</div></div>
    </div>
  );
}

const SHORT: Record<string, string> = {
  filtering: "Filtering", safeguarding: "Safeguarding", mental_health: "Mental health", cognitive: "Learning", emotional: "Wellbeing",
  manipulation: "Manipulation", privacy: "Privacy", reliability: "Accuracy", security: "Security", send: "SEND",
};
export const shortArea = (a: string) => SHORT[a] ?? a.replace(/_/g, " ");

/** Radar of pass rate by area. Axes with no score are drawn at zero. */
export function Radar({ areas }: { areas: Area[] }) {
  const [t, setT] = useState(prefersReduced() ? 1 : 0);
  useEffect(() => {
    if (prefersReduced()) { setT(1); return; }
    let raf = 0; const start = performance.now();
    const tick = (n: number) => { const p = Math.min(1, (n - start) / 900); setT(1 - Math.pow(1 - p, 3)); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [areas]);
  const n = areas.length, S = 300, cx = S / 2, cy = S / 2, R = 96;
  const pt = (i: number, f: number): [number, number] => { const a = (Math.PI * 2 * i) / n - Math.PI / 2; return [cx + Math.cos(a) * R * f, cy + Math.sin(a) * R * f]; };
  const poly = (f: (i: number) => number) => areas.map((_, i) => pt(i, f(i)).join(",")).join(" ");
  return (
    <svg className="radar" viewBox={`-30 -10 ${S + 60} ${S + 20}`} role="img" aria-label="Pass rate by area">
      {[0.25, 0.5, 0.75, 1].map((g) => <polygon key={g} className="gridline" points={poly(() => g)} />)}
      {areas.map((_, i) => { const [x, y] = pt(i, 1); return <line key={i} className="axis" x1={cx} y1={cy} x2={x} y2={y} />; })}
      <polygon className="shape" points={poly((i) => (areas[i].rate ?? 0) * t)} />
      {areas.map((a, i) => { const [x, y] = pt(i, (a.rate ?? 0) * t); return <circle key={a.area} className={"dot " + (a.status === "Fail" ? "bad" : a.status === "Conditions" ? "warn" : "")} cx={x} cy={y} r={4.5} />; })}
      {areas.map((a, i) => {
        const [x, y] = pt(i, 1.2), anchor = x < cx - 8 ? "end" : x > cx + 8 ? "start" : "middle";
        return <text key={a.area} x={x} y={y + 4} textAnchor={anchor}>{shortArea(a.area)}</text>;
      })}
    </svg>
  );
}
