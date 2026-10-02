import { useEffect, useId, useState, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { useCountUp } from "../lib/hooks";
import { pct } from "../lib/format";
import type { Area, Light, Summary } from "../lib/types";
import { Icon, type IconName } from "./Icon";

/* ---------- form fields ---------- */
interface FieldProps { label: string; hint?: ReactNode; className?: string }
export function Field({ label, hint, className, ...p }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return <label className={"field " + (className ?? "")} htmlFor={id}><span className="lbl">{label}</span><input id={id} className="input" {...p} />{hint && <div className="hint">{hint}</div>}</label>;
}
export function SelectField({ label, hint, className, children, ...p }: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return <label className={"field " + (className ?? "")} htmlFor={id}><span className="lbl">{label}</span><select id={id} className="select" {...p}>{children}</select>{hint && <div className="hint">{hint}</div>}</label>;
}
export function TextField({ label, hint, className, ...p }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return <label className={"field " + (className ?? "")} htmlFor={id}><span className="lbl">{label}</span><textarea id={id} className="textarea" {...p} />{hint && <div className="hint">{hint}</div>}</label>;
}

/* ---------- feedback ---------- */
export function Notice({ kind = "warn", children }: { kind?: "warn" | "error" | "ok" | "info"; children: ReactNode }) {
  return <div className={"notice " + (kind === "warn" ? "" : kind)} role={kind === "error" ? "alert" : undefined}>{children}</div>;
}
export const ErrorNotice = ({ error }: { error: unknown }) => <Notice kind="error">{error instanceof Error ? error.message : String(error)}</Notice>;

export function Spinner() { return <span className="spinner" aria-label="Loading" />; }
export function Skeleton({ h = 18, w = "100%" }: { h?: number; w?: string }) { return <div className="skeleton" style={{ height: h, width: w }} />; }
export function PageSkeleton() {
  return <div className="stack-lg fade" aria-busy="true"><div className="stack"><Skeleton h={34} w="40%" /><Skeleton h={16} w="60%" /></div><Skeleton h={150} /><Skeleton h={220} /></div>;
}

export function Empty({ icon = "inbox", title, children }: { icon?: IconName; title: string; children?: ReactNode }) {
  return <div className="empty fade"><Icon name={icon} /><h3 style={{ color: "var(--ink)", marginBottom: 4 }}>{title}</h3><div>{children}</div></div>;
}

/* ---------- status ---------- */
export function StatusChip({ status, critical }: { status: Area["status"]; critical?: boolean }) {
  const map = { Pass: ["g", "check", "Pass"], Conditions: ["a", "half", "Needs work"], Fail: ["r", "x", critical ? "Fail · critical" : "Fail"], "Not scored": ["n", "half", "Not scored"] } as const;
  const [cls, icon, label] = map[status];
  return <span className={"chip " + cls}><Icon name={icon} />{label}</span>;
}
export function LightChip({ light, label }: { light: Light; label: string }) {
  return <span className={"chip " + (light === "green" ? "g" : light === "amber" ? "a" : "r")}><Icon name={light === "green" ? "check" : light === "amber" ? "half" : "x"} />{label}</span>;
}

export function CountUp({ value }: { value: number }) { return <>{useCountUp(value)}</>; }

export function Bar({ value, tone, live }: { value: number; tone?: "bad" | "warn"; live?: boolean }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = requestAnimationFrame(() => setW(Math.max(0, Math.min(100, value)))); return () => cancelAnimationFrame(t); }, [value]);
  return <div className={"progress " + (tone ?? "") + (live ? " live" : "")} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}><i style={{ ["--w" as string]: w + "%" }} /></div>;
}
export function RateCell({ rate, status }: { rate: number | null; status: Area["status"] }) {
  return <div className="rate"><Bar value={(rate ?? 0) * 100} tone={status === "Fail" ? "bad" : status === "Conditions" ? "warn" : undefined} /><span>{pct(rate)}</span></div>;
}

export function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  return <div className="collapse" data-open={open}><div className="collapse-inner" inert={!open}>{children}</div></div>;
}

/* ---------- decision summary ---------- */
export function SummaryCard({ s }: { s: Summary }) {
  const word = { green: "GREEN", amber: "AMBER", red: "RED" }[s.light];
  return (
    <section className={"verdict " + s.light} aria-label="Decision summary">
      <div className="light"><Icon name={s.light === "green" ? "check" : s.light === "amber" ? "half" : "alert"} /></div>
      <div>
        <div className="eyebrow" style={{ color: "var(--c)" }}>{word}</div>
        <h2>{s.headline}</h2>
        <ul>{s.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
        <div className="conds">
          <strong style={{ color: "var(--ink)" }}>Before relying on this</strong>
          <ul>{s.conditions.map((c) => <li key={c}>{c}</li>)}</ul>
          <div style={{ marginTop: 8 }}>Re-test by <strong style={{ color: "var(--ink)" }}>{new Date(s.reviewBy).toLocaleDateString("en-GB", { dateStyle: "medium" })}</strong>, or sooner if the supplier changes the AI model or major features.</div>
        </div>
      </div>
    </section>
  );
}

export function Tabs({ items, current }: { items: [string, string][]; current: string }) {
  return <nav className="tabs" aria-label="Sections">{items.map(([k, label]) => <a key={k} className="tab" href={"#/admin/" + k} aria-current={k === current ? "page" : undefined}>{label}</a>)}</nav>;
}
