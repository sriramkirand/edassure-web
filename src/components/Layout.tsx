import { useEffect, type ReactNode } from "react";
import { useTheme } from "../lib/hooks";
import { ROLE_LABEL } from "../lib/format";
import type { Route } from "../lib/router";
import { canOperate, useSession } from "../lib/session";
import { Icon } from "./Icon";

export function Brand() {
  return <a className="brand" href="#/"><span className="logo"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7" /></svg></span>Assurance</a>;
}

export function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return <button className="btn ghost icon-btn" onClick={toggle} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} title="Theme"><Icon name={dark ? "sun" : "moon"} width={17} height={17} /></button>;
}

export function Layout({ route, children }: { route: Route; children: ReactNode }) {
  const { user, signOut } = useSession();
  const p = route.path;
  useEffect(() => { window.scrollTo(0, 0); }, [p]); // each screen starts at the top
  const link = (href: string, label: string, active: boolean) => <a key={href} href={"#" + href} aria-current={active ? "page" : undefined}>{label}</a>;
  return (
    <>
      <header className="topbar">
        <div className="wrap">
          <Brand />
          {user && !user.mustChange && (
            <nav className="nav" aria-label="Main">
              {user.role === "client" ? link("/", "Your checks", p === "/" || p.startsWith("/runs"))
                : <>
                  {link("/", "Runs", p === "/" || p.startsWith("/runs"))}
                  {canOperate(user) && link("/new", "New check", p === "/new")}
                  {user.role === "admin" && link("/admin", "Administration", p.startsWith("/admin"))}
                </>}
              {link("/help", "How it works", p === "/help")}
            </nav>
          )}
          <div className="row right">
            {user && <span className="who">{user.name} · {ROLE_LABEL[user.role]}</span>}
            {user && <a className="btn link" href="#/account">Account</a>}
            {user && <button className="btn link" onClick={() => void signOut()}>Sign out</button>}
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="main"><div className="wrap page" key={route.path}>{children}</div></main>
      <footer className="footer"><div className="wrap">Results describe the tested version, configuration and date only. They are not a guarantee of safety or legal advice.</div></footer>
    </>
  );
}
