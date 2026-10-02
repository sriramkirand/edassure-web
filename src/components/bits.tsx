import { useEffect, useState, type ReactNode } from "react";
import { CountUp } from "./ui";
import { Icon, type IconName } from "./Icon";

export function Kpi({ icon, label, value, tone = "" }: { icon: IconName; label: string; value: number; tone?: "" | "red" | "amber" | "green" | "gold" }) {
  return <div className={"kpi " + tone}><span className="ico"><Icon name={icon} /></span><div><div className="num"><CountUp value={value} /></div><div className="cap">{label}</div></div></div>;
}

const PALETTE = ["#1e5c52", "#8a5a2b", "#5b4b8a", "#a1473f", "#2b6b8a", "#7a7a2e", "#8a3b6b"];
export function Avatar({ name }: { name: string }) {
  let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
  return <span className="avatar" style={{ ["--bg-a" as string]: PALETTE[h % PALETTE.length] } as React.CSSProperties} aria-hidden="true">{initials || "?"}</span>;
}

export function FilterChips<T extends string>({ items, value, onChange }: { items: { key: T; label: string; count?: number }[]; value: T; onChange: (k: T) => void }) {
  return <div className="filters" role="group" aria-label="Filter">{items.map((i) => (
    <button key={i.key} className="fchip" aria-pressed={i.key === value} onClick={() => onChange(i.key)}>{i.label}{i.count != null && <span className="count">{i.count}</span>}</button>))}</div>;
}

/** Sticky in-page navigation that highlights the section currently in view. */
export function SectionNav({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id);
  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (vis) setActive(vis.target.id);
    }, { rootMargin: "-20% 0px -65% 0px" });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [items]);
  return <nav className="sections" aria-label="On this page">{items.map((i) => (
    <a key={i.id} href={"#/_" + i.id} aria-current={active === i.id} onClick={(e) => { e.preventDefault(); document.getElementById(i.id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>{i.label}</a>))}</nav>;
}

export const Hero = ({ children }: { children: ReactNode }) => <section className="hero">{children}</section>;
