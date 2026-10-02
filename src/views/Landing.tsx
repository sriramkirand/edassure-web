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

// Illustrative data only: it is shown on the page as an example, not as a real result.
const SAMPLE_AREAS: Area[] = [
  ["filtering", "Filtering", 0.96, "Pass"], ["safeguarding", "Safeguarding", 1, "Pass"], ["mental_health", "Mental health", 0.9, "Conditions"], ["cognitive", "Learning", 0.55, "Fail"],
  ["emotional", "Wellbeing", 0.8, "Conditions"], ["manipulation", "Manipulation", 1, "Pass"], ["reliability", "Accuracy", 0.93, "Pass"], ["security", "Security", 0.86, "Conditions"],
].map(([area, label, rate, status]) => ({ area: area as string, label: label as string, passed: 0, failed: 0, review: 0, skipped: 0, rate: rate as number, minimum: 0.9, criticalFailure: false, status: status as Area["status"] }));
const SAMPLE_SUMMARY: Summary = {
  light: "amber", headline: "Use only with conditions",
  reasons: ["Good: it blocks harmful requests without wrongly blocking normal lessons.", "Problem: it gives pupils answers or complete work instead of helping them learn.", "Needs improvement: it can sometimes be tricked into ignoring its rules."],
  conditions: ["The supplier fixes the 2 problem areas (learning, security) and the tool is re-tested.", "A person must finish reviewing 6 sensitive response(s) before this decision is final.", "Supplier documents (privacy notice, risk assessment, complaints process) have not been checked by this test."],
  reviewBy: new Date(Date.now() + 183 * 864e5).toISOString().slice(0, 10),
};

const AREAS: [IconName, string, string][] = [
  ["shield", "Filtering", "Does it block harmful content for the age group, in other languages, with misspellings, and part-way through a conversation?"],
  ["eye", "Safeguarding", "When a pupil says something worrying, does it point them to a trusted adult, and never to secrecy?"],
  ["heart", "Mental health", "Does it respond safely to distress, with supportive wording and real human help?"],
  ["book", "Learning", "Does it give hints and let pupils think, rather than hand over finished work?"],
  ["person", "Wellbeing", "Does it avoid acting like a friend or encouraging pupils to rely on it instead of people?"],
  ["bolt", "Manipulation", "Does it avoid flattery, pressure, false confidence and sales tactics?"],
  ["target", "Accuracy", "Are its answers correct, and does it admit when it does not know?"],
  ["lock", "Security", "Can pupils trick it into ignoring its rules or revealing its instructions?"],
  ["file", "Privacy", "Does it protect other users' information?"],
  ["users", "Inclusion", "Does it adapt explanations for learners who need support?"],
];

const FAQ: [string, string][] = [
  ["Do you certify that a tool is safe?", "No. We test how a tool behaves in a set of realistic situations and tell you plainly what we found. A green result means no significant problems were found in the tests we ran, not that the tool is guaranteed safe. Every result states the version and date it applies to."],
  ["Who reads the sensitive responses?", "People do. Anything involving safeguarding, distress or other sensitive situations goes to a trained reviewer, and their verdict replaces the automated one. Reviews are recorded under the reviewer's name."],
  ["What does the supplier have to give us?", "Either a test key or sandbox for the tool, or a test account we can use by hand in its normal chat window. We never need real pupil data. If a tool has no way for us to test it, we say so."],
  ["Can we trust a result a supplier paid for?", "That is why we publish our independence rules: fees never depend on the outcome, the method is public and the same for every supplier, we do not fix a tool and then grade it, and suppliers can reply but cannot edit findings."],
  ["Does this cover everything in the DfE standards?", "No, and we say so in every report. Chat testing can reach part of the standards. The rest, such as privacy notices, complaints processes and safeguarding alerts, needs evidence from the supplier, which we list as not yet checked."],
  ["How often should a tool be re-tested?", "Whenever the supplier changes the AI model or major features, and at least termly or annually for tools in regular use. The DfE standards expect suppliers to test new versions before release."],
];

export function Landing() {
  const email = contact();
  const [open, setOpen] = useState<number | null>(0);
  const [scrolled, setScrolled] = useState(false);
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
              <span className="lp-badge"><Icon name="shield" width={14} height={14} />Independent AI tool checks for UK education</span>
              <h1 className="lp-h1">Is this AI tool <em>right</em> for the pupils who will use it?</h1>
              <p className="lp-lead">We test the AI tools used in schools and colleges against the DfE's generative AI product safety standards, then give you a plain-English answer you can take to governors, your data protection lead and your supplier.</p>
            </div>
            <div className="row" style={{ gap: 12 }}>
              <button className="btn lg" onClick={goSignIn}>Sign in<Icon name="arrow" width={17} height={17} /></button>
              {email ? <a className="btn ghost lg" href={`mailto:${email}?subject=${encodeURIComponent("Request an AI tool check")}`}>Request a check</a>
                : <a className="btn ghost lg" href="#/" onClick={scrollTo("how")}>See how it works</a>}
            </div>
            <ul className="lp-checks">
              <li><Icon name="check" />Sensitive responses are read by a person</li><li><Icon name="check" />One clear verdict, with the evidence behind it</li><li><Icon name="check" />Re-tested when the AI model changes</li>
            </ul>
          </div>
          <div className="lp-hero-art" aria-hidden="true">
            <div className="lp-float one"><Ring value={0.72} size={86} stroke={8} tone="tone-amber" sub="passed" />
              <div><div className="t">Acme Homework Helper</div><div className="s">Oakfield Trust · Ages 11–14</div><span className="tag amber">AMBER · Use with conditions</span></div></div>
            <div className="lp-float two"><span className="dot red" /><div><div className="t">Safeguarding</div><div className="s">Points pupils to a trusted adult</div></div><span className="chip g"><Icon name="check" />Pass</span></div>
            <div className="lp-float three"><span className="dot gold" /><div><div className="t">Learning</div><div className="s">Gives answers, not hints</div></div><span className="chip r"><Icon name="x" />Fix</span></div>
          </div>
        </div>
      </section>

      {/* ---------- problem ---------- */}
      <section className="lp-section">
        <div className="wrap stack-lg">
          <Reveal><div className="lp-head"><span className="eyebrow">The problem</span><h2>AI is arriving in classrooms faster than anyone can check it.</h2>
            <p className="muted">Schools and trusts are asked to approve tools they cannot easily test. Suppliers say they are safe. Governors want evidence.</p></div></Reveal>
          <div className="grid-3">
            {([["chat", "Claims are easy, evidence is hard", "A supplier's brochure does not show what happens when a pupil types something unexpected."], ["users", "Few people have time to test", "Data protection leads and IT teams are already stretched, and AI tools change every few weeks."], ["file", "Governors need something they can read", "A technical report is not a decision. Leaders need a clear answer and what to do next."]] as [IconName, string, string][]).map(([ic, t, d], i) => (
              <Reveal key={t} delay={i * 90}><div className="lp-card"><span className="lp-ico"><Icon name={ic} /></span><h3>{t}</h3><p className="muted">{d}</p></div></Reveal>))}
          </div>
        </div>
      </section>

      {/* ---------- how ---------- */}
      <section id="how" className="lp-section alt anchor">
        <div className="wrap stack-lg">
          <Reveal><div className="lp-head"><span className="eyebrow">How it works</span><h2>From “can we use this?” to a clear answer.</h2></div></Reveal>
          <div className="lp-steps">
            {([["1", "Scope", "We agree the tool, the age group, who uses it and what “good” looks like."], ["2", "Test", "We run realistic situations pupils might create, repeated to see how consistent the tool is."], ["3", "Review", "A person reads every sensitive response and records their own verdict."], ["4", "Report", "You get a plain-English decision, the evidence, and what the supplier must fix."]] as const).map(([n, t, d], i) => (
              <Reveal key={n} delay={i * 110}><div className="lp-step"><span className="num">{n}</span><h3>{t}</h3><p className="muted">{d}</p></div></Reveal>))}
          </div>
        </div>
      </section>

      {/* ---------- what we test ---------- */}
      <section id="tests" className="lp-section anchor">
        <div className="wrap stack-lg">
          <Reveal><div className="lp-head"><span className="eyebrow">What we test</span><h2>The situations that matter for children.</h2>
            <p className="muted">Our framework is mapped to all 13 sections of the DfE generative AI product safety standards. What a conversation can show, we test. What needs documents or admin access, we ask the supplier to evidence and report as not yet checked.</p></div></Reveal>
          <div className="grid-areas">
            {AREAS.map(([ic, t, d], i) => (<Reveal key={t} delay={(i % 5) * 60}><div className="lp-area"><span className="lp-ico sm"><Icon name={ic} /></span><div><h3>{t}</h3><p className="muted small">{d}</p></div></div></Reveal>))}
          </div>
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
            <Reveal><div className="lp-card tall"><span className="lp-ico"><Icon name="book" /></span><h3>Schools, trusts, colleges and universities</h3>
              <ul className="lp-list"><li>An independent check before you approve or renew a tool</li><li>A governor-ready summary and the evidence behind it</li><li>Clear conditions to hold the supplier to</li><li>A re-check when the tool changes</li></ul></div></Reveal>
            <Reveal delay={100}><div className="lp-card tall"><span className="lp-ico"><Icon name="bolt" /></span><h3>Edtech and AI suppliers</h3>
              <ul className="lp-list"><li>Find problems before your customers do</li><li>Show schools evidence instead of claims</li><li>The same published method for everyone</li><li>Re-tests when you change your model or release</li></ul></div></Reveal>
          </div>
        </div>
      </section>

      {/* ---------- independence ---------- */}
      <section id="independence" className="lp-section lp-dark anchor">
        <div className="wrap lp-indep">
          <Reveal><div className="stack"><span className="eyebrow">Independence</span><h2>Suppliers can pay for a test. They cannot pay for a result.</h2>
            <p>Because the company being tested sometimes pays for the test, we publish the rules that keep results honest.</p></div></Reveal>
          <Reveal delay={120}><ul className="lp-rules">
            {["Fees never depend on the outcome", "The method is public and the same for every supplier", "We do not fix a tool and then grade it", "Suppliers can reply to findings but cannot edit them", "Serious child-safety problems are escalated if not fixed"].map((r) => <li key={r}><Icon name="check" />{r}</li>)}
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
          <p className="small muted">Assurance provides independent testing of AI tools used in education. We are not affiliated with, or endorsed by, the Department for Education, Ofsted or any regulator. Results describe the tested version, configuration and date only. They are not a guarantee of safety or legal advice.</p>
        </div>
      </footer>
    </div>
  );
}
