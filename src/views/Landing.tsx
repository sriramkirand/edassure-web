import { useEffect, useRef, useState, type ReactNode } from "react";
import { Radar, Ring } from "../components/charts";
import { Icon, type IconName } from "../components/Icon";
import { Brand, ThemeToggle } from "../components/Layout";
import { Collapse, SummaryCard } from "../components/ui";
import type { Area, Summary } from "../lib/types";

const goSignIn = () => { location.hash = "#/login"; };
const scrollTo = (id: string) => (e: React.MouseEvent) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); };
const contact = () => window.EDASSURE_CONFIG?.contactEmail;

/** Fades content up once when it scrolls into view. */
function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (!("IntersectionObserver" in window)) { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el); return () => io.disconnect();
  }, []);
  return <div ref={ref} className={"reveal " + (seen ? "in " : "") + className} style={{ ["--d" as string]: delay + "ms" } as React.CSSProperties}>{children}</div>;
}

/* ---------- sector examples (illustrative only; shown to visitors as examples, not real results) ---------- */
interface SectorView { key: string; label: string; tool: string; org: string; rows: [string, string, "Pass" | "Fix"][]; anchor: string; status: string }
const SECTORS: SectorView[] = [
  { key: "education", label: "Education", tool: "Homework Helper", org: "Example Trust · Ages 11–14", anchor: "DfE generative AI product safety standards (Jan 2026)", status: "Available now",
    rows: [["Safeguarding", "Points pupils to a trusted adult", "Pass"], ["Learning", "Gives answers, not hints", "Fix"]] },
  { key: "public", label: "Public services", tool: "Council Services Assistant", org: "Example Council · Residents", anchor: "AI Playbook for the UK Government and the ATRS transparency standard", status: "Universal Core now · sector tests in development",
    rows: [["Accuracy", "Does not invent eligibility", "Pass"], ["Human oversight", "Offers a route to a person", "Fix"]] },
  { key: "hr", label: "HR and recruitment", tool: "CV Screening Assistant", org: "Example Ltd · HR", anchor: "ICO guidance on AI in recruitment and the Equality Act", status: "Universal Core now · sector tests in development",
    rows: [["Transparency", "Says when automated tools are used", "Pass"], ["Human oversight", "No automated final rejections", "Fix"]] },
  { key: "health", label: "Health and care", tool: "Appointments Chatbot", org: "Example Practice · Patients", anchor: "NHS DTAC and DCB0129 clinical safety (evidence review)", status: "Universal Core now · sector tests in development",
    rows: [["Advice limits", "Does not tell people to stop medication", "Pass"], ["Escalation", "Urgent symptoms go to a person", "Fix"]] },
  { key: "finance", label: "Finance", tool: "Customer Help Assistant", org: "Example Insurer · Customers", anchor: "FCA Consumer Duty and vulnerable-customer expectations", status: "Universal Core now · sector tests in development",
    rows: [["Advice limits", "No personal investment advice", "Pass"], ["Vulnerable people", "Signposts genuine help", "Fix"]] },
  { key: "customer", label: "Customer service", tool: "Support Assistant", org: "Any department", anchor: "Your own service standards and consumer law", status: "Universal Core now",
    rows: [["Honesty", "Says it is an AI when asked", "Pass"], ["Overpromising", "Does not promise refunds it cannot give", "Fix"]] },
];

// Illustrative data only.
const SAMPLE_AREAS: Area[] = [
  ["harmful_content", "Harmful content", 0.96, "Pass"], ["vulnerable_people", "Vulnerable people", 1, "Pass"], ["advice_boundaries", "Advice limits", 0.7, "Fail"], ["oversight", "Human oversight", 0.85, "Conditions"],
  ["transparency", "Transparency", 1, "Pass"], ["manipulation", "Manipulation", 1, "Pass"], ["accuracy", "Accuracy", 0.93, "Pass"], ["security", "Security", 0.86, "Conditions"],
].map(([area, label, rate, status]) => ({ area: area as string, label: label as string, passed: 0, failed: 0, review: 0, skipped: 0, rate: rate as number, minimum: 0.9, criticalFailure: false, status: status as Area["status"] }));
const SAMPLE_SUMMARY: Summary = {
  light: "amber", headline: "Use only with conditions",
  reasons: ["Good: it refuses harmful requests without wrongly blocking legitimate ones.", "Problem: it gives advice it is not qualified to give.", "Needs improvement: it does not always hand over to a person when it should."],
  conditions: ["The supplier fixes the 2 problem areas (advice limits, human oversight) and the tool is re-tested.", "A person must finish reviewing 6 sensitive response(s) before this decision is final.", "Supplier documents (privacy notice, risk assessment, complaints process) have not been checked by this test."],
  reviewBy: new Date(Date.now() + 183 * 864e5).toISOString().slice(0, 10),
};

const AREAS: [IconName, string, string, boolean?][] = [
  ["shield", "Harmful content", "Does it refuse harmful or illegal requests, in other languages, with misspellings, and part-way through a conversation, without blocking legitimate ones?"],
  ["heart", "Vulnerable people", "When someone is in distress or reports harm, does it respond safely and point to real human help, never to secrecy?"],
  ["lock", "Security", "Can people trick it into ignoring its rules or revealing its instructions?"],
  ["file", "Privacy", "Does it keep other people's information private?"],
  ["target", "Accuracy and honesty", "Are its answers correct, and does it admit when it does not know rather than invent policies, documents or entitlements?"],
  ["eye", "Transparency", "Does it say it is an AI, and is it honest about how decisions are made?"],
  ["users", "Human oversight", "Does it hand over to a person when it should, explain how to challenge a decision, and never make final decisions alone?"],
  ["book", "Advice limits", "Does it stay within its remit and point to qualified help for medical, legal and financial questions?"],
  ["bolt", "Manipulation", "Does it avoid flattery, pressure, false confidence and sales tactics?"],
  ["person", "Fairness", "Does it treat different groups of people consistently? Matched-prompt testing is being added.", true],
];

const FAQ: [string, string][] = [
  ["Do you certify that a tool is safe?", "No. We test how a tool behaves in a set of realistic situations and tell you plainly what we found. A green result means no significant problems were found in the tests we ran, not that the tool is guaranteed safe. Every result states the version and date it applies to."],
  ["Which sectors do you cover?", "The Universal Core tests are sector-neutral and available now. Education also has a full pack built on the DfE standards. We are building sector-specific tests, for example for HR and recruitment, public services, health admin and finance, with reviewers from each field. Until a sector pack exists, we say so in the report instead of implying coverage."],
  ["Who reads the sensitive responses?", "People do. Anything involving distress, harm or other sensitive situations goes to a trained reviewer, and their verdict replaces the automated one. Reviews are recorded under the reviewer's name."],
  ["What does the supplier have to give us?", "Either a test key or sandbox for the tool, or a test account we can use by hand in its normal chat window. We never need real personal data. If a tool has no way for us to test it, we say so."],
  ["Can we trust a result a supplier paid for?", "That is why we publish our independence rules: fees never depend on the outcome, the method is public and the same for every supplier, we do not fix a tool and then grade it, and suppliers can reply but cannot edit findings."],
  ["Does this cover every regulation that applies to us?", "No, and we say so in every report. Chat testing can show how a tool behaves. Privacy notices, risk assessments, complaints processes and governance need evidence from the supplier, which we list as not yet checked. Our reports are not legal advice."],
  ["How often should a tool be re-tested?", "Whenever the supplier changes the AI model or major features, and at least yearly for tools in regular use. AI tools change often, so an old result goes stale quickly."],
];

export function Landing() {
  const email = contact();
  const [open, setOpen] = useState<number | null>(0);
  const [scrolled, setScrolled] = useState(false);
  const [sectorKey, setSectorKey] = useState("education");
  const sector = SECTORS.find((s) => s.key === sectorKey) ?? SECTORS[0];
  useEffect(() => { const on = () => setScrolled(window.scrollY > 8); on(); window.addEventListener("scroll", on, { passive: true }); return () => window.removeEventListener("scroll", on); }, []);

  return (
    <div className="landing">
      <header className={"lp-nav" + (scrolled ? " scrolled" : "")}>
        <div className="wrap row spread">
          <Brand />
          <nav className="lp-links" aria-label="Page sections">
            <a href="#/" onClick={scrollTo("how")}>How it works</a><a href="#/" onClick={scrollTo("tests")}>What we test</a>
            <a href="#/" onClick={scrollTo("who")}>Who it is for</a><a href="#/" onClick={scrollTo("independence")}>Independence</a><a href="#/" onClick={scrollTo("faq")}>FAQ</a>
          </nav>
          <div className="row"><ThemeToggle /><button className="btn" onClick={goSignIn}>Sign in</button></div>
        </div>
      </header>

      {/* ---------- hero ---------- */}
      <section className="lp-hero">
        <div className="wrap lp-hero-grid">
          <div className="stack-lg">
            <div className="stack">
              <span className="lp-badge"><Icon name="shield" width={14} height={14} />Independent AI assurance for UK organisations</span>
              <h1 className="lp-h1">Is this AI tool <em>ready</em> for the people who will rely on it?</h1>
              <p className="lp-lead">We test the AI tools your organisation uses, in any department, and give you a plain-English answer you can take to leadership, regulators and suppliers. With the evidence behind it.</p>
            </div>
            <div className="stack">
              <span className="small muted" id="sector-label">See an example for your sector</span>
              <div className="filters" role="group" aria-labelledby="sector-label">
                {SECTORS.map((s) => <button key={s.key} className="fchip" aria-pressed={s.key === sectorKey} onClick={() => setSectorKey(s.key)}>{s.label}</button>)}
              </div>
            </div>
            <div className="row" style={{ gap: 12 }}>
              <button className="btn lg" onClick={goSignIn}>Sign in<Icon name="arrow" width={17} height={17} /></button>
              {email ? <a className="btn ghost lg" href={`mailto:${email}?subject=${encodeURIComponent("Request an AI tool check")}`}>Request a check</a>
                : <a className="btn ghost lg" href="#/" onClick={scrollTo("how")}>See how it works</a>}
            </div>
          </div>
          <div className="lp-hero-art" aria-live="polite">
            <div className="lp-float one" key={sector.key + "1"}><Ring value={0.72} size={86} stroke={8} tone="tone-amber" sub="passed" />
              <div><div className="t">{sector.tool}</div><div className="s">{sector.org}</div><span className="tag amber">AMBER · Use with conditions</span></div></div>
            {sector.rows.map(([t, d, r], i) => (
              <div key={sector.key + t} className={"lp-float " + (i === 0 ? "two" : "three")}>
                <span className={"dot " + (r === "Pass" ? "red" : "gold")} /><div><div className="t">{t}</div><div className="s">{d}</div></div>
                {r === "Pass" ? <span className="chip g"><Icon name="check" />Pass</span> : <span className="chip r"><Icon name="x" />Fix</span>}
              </div>))}
            <div className="lp-anchor"><span className="eyebrow">Measured against</span><div>{sector.anchor}</div><span className="lp-status">{sector.status}</span><span className="small muted">Illustrative example, not a real result.</span></div>
          </div>
        </div>
      </section>

      {/* ---------- problem ---------- */}
      <section className="lp-section">
        <div className="wrap stack-lg">
          <Reveal><div className="lp-head"><span className="eyebrow">The problem</span><h2>AI is arriving in every department faster than anyone can check it.</h2>
            <p className="muted">HR, finance, customer service, policy, legal: teams adopt AI tools quickly. Leaders are still asked to be accountable for them.</p></div></Reveal>
          <div className="grid-3">
            {([["chat", "Claims are easy, evidence is hard", "A supplier's brochure does not show what happens when someone types something unexpected, or something vulnerable."], ["users", "Few people have time to test", "Data protection, IT and compliance teams are already stretched, and AI tools change every few weeks."], ["file", "Leaders need something they can read", "A technical report is not a decision. Boards and governors need a clear answer and what to do next."]] as [IconName, string, string][]).map(([ic, t, d], i) => (
              <Reveal key={t} delay={i * 90}><div className="lp-card"><span className="lp-ico"><Icon name={ic} /></span><h3>{t}</h3><p className="muted">{d}</p></div></Reveal>))}
          </div>
        </div>
      </section>

      {/* ---------- how ---------- */}
      <section id="how" className="lp-section alt anchor">
        <div className="wrap stack-lg">
          <Reveal><div className="lp-head"><span className="eyebrow">How it works</span><h2>From “can we use this?” to a clear answer.</h2></div></Reveal>
          <div className="lp-steps">
            {([["1", "Scope", "We agree the tool, the department, who it serves and what it affects, and choose the right tests."], ["2", "Test", "We run realistic situations real users might create, repeated to see how consistent the tool is."], ["3", "Review", "A person reads every sensitive response and records their own verdict."], ["4", "Report", "You get a plain-English decision, the evidence, and what the supplier must fix."]] as const).map(([n, t, d], i) => (
              <Reveal key={n} delay={i * 110}><div className="lp-step"><span className="num">{n}</span><h3>{t}</h3><p className="muted">{d}</p></div></Reveal>))}
          </div>
        </div>
      </section>

      {/* ---------- what we test ---------- */}
      <section id="tests" className="lp-section anchor">
        <div className="wrap stack-lg">
          <Reveal><div className="lp-head"><span className="eyebrow">What we test</span><h2>A universal core, then tests for your sector.</h2>
            <p className="muted">Every tool, whatever the department, should get these right. On top of the core, sector packs add the rules that matter in your field.</p></div></Reveal>
          <div className="grid-areas">
            {AREAS.map(([ic, t, d, soon], i) => (<Reveal key={t} delay={(i % 5) * 60}><div className="lp-area"><span className="lp-ico sm"><Icon name={ic} /></span><div><h3>{t}{soon && <span className="chip n" style={{ marginLeft: 8 }}>Coming</span>}</h3><p className="muted small">{d}</p></div></div></Reveal>))}
          </div>
          <Reveal><div className="lp-sectors">
            <h3>Sector packs</h3>
            <ul>{SECTORS.map((s) => <li key={s.key}><strong>{s.label}</strong><span className="muted small">{s.anchor}</span><span className={"chip " + (s.key === "education" ? "g" : "n")}>{s.status}</span></li>)}</ul>
            <p className="small muted">We say plainly which tests exist today. A sector listed as “in development” is tested with the Universal Core only, and the report says so.</p>
          </div></Reveal>
        </div>
      </section>

      {/* ---------- sample ---------- */}
      <section className="lp-section alt">
        <div className="wrap stack-lg">
          <Reveal><div className="lp-head"><span className="eyebrow">What you get</span><h2>A decision first. The detail underneath.</h2>
            <p className="muted">An illustrative example of a result. It is not a real tool.</p></div></Reveal>
          <Reveal><div className="lp-sample">
            <SummaryCard s={SAMPLE_SUMMARY} />
            <div className="card radar-card"><Radar areas={SAMPLE_AREAS} /></div>
          </div></Reveal>
        </div>
      </section>

      {/* ---------- who ---------- */}
      <section id="who" className="lp-section anchor">
        <div className="wrap stack-lg">
          <Reveal><div className="lp-head"><span className="eyebrow">Who it is for</span><h2>One method, two reasons to use it.</h2></div></Reveal>
          <div className="grid-2">
            <Reveal><div className="lp-card tall"><span className="lp-ico"><Icon name="users" /></span><h3>Organisations using AI, in any department</h3>
              <ul className="lp-list"><li>An independent check before you approve or renew a tool</li><li>A board-ready summary and the evidence behind it</li><li>A register of the AI tools each department uses, with re-test dates</li><li>Clear conditions to hold the supplier to</li></ul></div></Reveal>
            <Reveal delay={100}><div className="lp-card tall"><span className="lp-ico"><Icon name="bolt" /></span><h3>AI and software suppliers</h3>
              <ul className="lp-list"><li>Find problems before your customers do</li><li>Show buyers evidence instead of claims</li><li>The same published method for everyone</li><li>Re-tests when you change your model or release</li></ul></div></Reveal>
          </div>
        </div>
      </section>

      {/* ---------- independence ---------- */}
      <section id="independence" className="lp-section lp-dark anchor">
        <div className="wrap lp-indep">
          <Reveal><div className="stack"><span className="eyebrow">Independence</span><h2>Suppliers can pay for a test. They cannot pay for a result.</h2>
            <p>Because the company being tested sometimes pays for the test, we publish the rules that keep results honest.</p></div></Reveal>
          <Reveal delay={120}><ul className="lp-rules">
            {["Fees never depend on the outcome", "The method is public and the same for every supplier", "We do not fix a tool and then grade it", "Suppliers can reply to findings but cannot edit them", "Serious harm to people is escalated if not fixed"].map((r) => <li key={r}><Icon name="check" />{r}</li>)}
          </ul></Reveal>
        </div>
      </section>

      {/* ---------- faq ---------- */}
      <section id="faq" className="lp-section anchor">
        <div className="wrap stack-lg" style={{ maxWidth: 820 }}>
          <Reveal><div className="lp-head"><span className="eyebrow">Questions</span><h2>Straight answers.</h2></div></Reveal>
          <div className="lp-faq">
            {FAQ.map(([q, a], i) => (
              <Reveal key={q} delay={i * 40}><div className={"lp-faq-item" + (open === i ? " open" : "")}>
                <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}><span>{q}</span><Icon name="chevron" width={20} height={20} /></button>
                <Collapse open={open === i}><p className="muted">{a}</p></Collapse>
              </div></Reveal>))}
          </div>
        </div>
      </section>

      {/* ---------- final CTA ---------- */}
      <section className="lp-section">
        <div className="wrap"><Reveal><div className="lp-cta">
          <div className="stack"><h2>Ready to see where your AI tools stand?</h2><p>Sign in to view your checks, or get in touch to request one.</p></div>
          <div className="row" style={{ gap: 12 }}><button className="btn light lg" onClick={goSignIn}>Sign in<Icon name="arrow" width={17} height={17} /></button>
            {email && <a className="btn outline lg" href={`mailto:${email}?subject=${encodeURIComponent("Request an AI tool check")}`}>Request a check</a>}</div>
        </div></Reveal></div>
      </section>

      <footer className="lp-footer">
        <div className="wrap stack">
          <div className="row spread"><Brand /><button className="btn link" onClick={goSignIn}>Sign in</button></div>
          <p className="small muted">Assurance provides independent testing of AI tools used by organisations. We are not affiliated with, or endorsed by, any government department, regulator or standards body named on this page. Frameworks are named only to show what tests are anchored on. Results describe the tested version, configuration and date only. They are not a guarantee of safety, a certification, or legal advice.</p>
        </div>
      </footer>
    </div>
  );
}
