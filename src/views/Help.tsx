import { useEffect, type ReactNode } from "react";
import { SectionNav } from "../components/bits";
import { Icon } from "../components/Icon";
import type { Route } from "../lib/router";
import { isStaff, useUser } from "../lib/session";

const Sec = ({ id, title, children }: { id: string; title: string; children: ReactNode }) => (
  <section id={id} className="anchor stack"><h2>{title}</h2>{children}</section>
);
const Term = ({ children }: { children: ReactNode }) => <strong>{children}</strong>;

const JOURNEY: [string, string][] = [
  ["Set up", "Create a check: the tool, the client, who it talks to, which test pack."],
  ["Run tests", "Scripted conversations are sent to the tool, several times each."],
  ["Review", "A person decides the sensitive or unclear answers."],
  ["Fix and reply", "Recommended fixes; the supplier's response recorded."],
  ["Sign off", "Optionally, a second named person countersigns."],
  ["Share", "Publish to the client and send the report."],
  ["Re-test", "Run again when the tool or its AI model changes."],
];

/** In-app guide. Staff get the full walkthrough; clients get the short "how to read your report" version. */
export function Help({ route }: { route: Route }) {
  const user = useUser(), staff = isStaff(user);
  useEffect(() => {
    const s = route.query.get("s");
    if (s) setTimeout(() => document.getElementById(s)?.scrollIntoView({ block: "start", behavior: "smooth" }), 80);
  }, [route.query]);

  const nav = staff
    ? [["what", "What this is"], ["steps", "How a check works"], ["evidence", "Evidence modes"], ["review", "Human review"], ["result", "Reading the result"], ["fixes", "Fixes & replies"], ["signoff", "Sign-off"], ["share", "Sharing"], ["roles", "Who can do what"], ["limits", "Limits"], ["glossary", "Glossary"]]
    : [["what", "What this is"], ["result", "Reading your report"], ["signoff", "Signed reports"], ["limits", "Limits"], ["glossary", "Glossary"]];

  return (
    <div className="stack-lg">
      <div className="stack"><div className="eyebrow">Guide</div><h1 style={{ margin: 0 }}>How it works</h1>
        <p className="muted" style={{ margin: 0, maxWidth: "46em" }}>{staff ? "Everything the app does, in the order you will use it." : "How to read the report you have been given, and what it does and does not tell you."}</p></div>
      <SectionNav items={nav.map(([id, label]) => ({ id, label }))} />

      <Sec id="what" title="What this is">
        <p>This service tests an AI tool, such as a chatbot or assistant, the way a real user might use it. It asks the tool a fixed set of questions, including difficult and risky ones, records exactly what it replies, and checks each reply against clear rules. It then turns the results into a plain-English answer: <Term>green</Term>, <Term>amber</Term> or <Term>red</Term>, with the reasons.</p>
        <p>It tests <Term>how the tool replies</Term> under test conditions. It does not look inside the tool, and it does not replace checking the supplier's documents, contracts or data handling.</p>
        {staff && <div className="journey" role="list">{JOURNEY.map(([t, d], i) => <div key={t} role="listitem" className="card"><span className="pill">{i + 1}</span><strong>{t}</strong><span className="small muted">{d}</span></div>)}</div>}
      </Sec>

      {staff && (
        <>
          <Sec id="steps" title="How a check works, step by step">
            <ol className="stack" style={{ paddingLeft: "1.2em", margin: 0 }}>
              <li><Term>New check.</Term> Name the tool and the client, say what the tool is for and who it talks to (learners, the public, staff, vulnerable people), choose the sector, and pick a test pack. The <Term>core pack</Term> works for any sector. Sector packs, such as education, add checks specific to that sector. More repeats make the result more reliable because AI answers vary.</li>
              <li><Term>Run the tests.</Term> What happens next depends on the evidence mode below. The progress bar shows how many tests are done. If a test could not reach the tool, use <Term>Retry errored</Term>; an error is never counted as a pass.</li>
              <li><Term>Review.</Term> Sensitive answers and anything the automated checks cannot decide wait in the review queue for a person.</li>
              <li><Term>Read the result,</Term> add fixes and supplier responses, then optionally sign off and share. Each is explained below.</li>
            </ol>
          </Sec>

          <Sec id="evidence" title="The four ways to gather evidence">
            <div className="table-wrap"><table><thead><tr><th>Mode</th><th>What happens</th><th>Confidence</th></tr></thead><tbody>
              <tr><td><Term>Direct connection</Term></td><td>The app sends each test message to the tool's API and records the replies. The tool's key is held only in your browser for the session and is never stored.</td><td>High: we captured every reply.</td></tr>
              <tr><td><Term>Manual capture</Term></td><td>You paste each test into the tool's own chat window (for example a website you have a login for) and paste back the reply.</td><td>High: we captured every reply, by hand.</td></tr>
              <tr><td><Term>Open-source engine</Term></td><td>You run Promptfoo on your own computer with the bridge tool. It sends the tests, uploads the transcripts, and records a fingerprint of the raw output. It can also run attack testing, whose findings a person must confirm.</td><td>High: transcripts plus a fingerprint, and an independent cross-check.</td></tr>
              <tr><td><Term>Imported spreadsheet</Term></td><td>The client or supplier fills in a spreadsheet of replies, and you upload it.</td><td>Lower: we did not capture the replies, and the report says so.</td></tr>
            </tbody></table></div>
            <p className="small muted">Only test systems you are authorised to test. Never use real personal data in tests.</p>
          </Sec>

          <Sec id="review" title="Why a person reviews some answers">
            <p>Rule-based checks are quick but blunt: they look for words and patterns. So anything sensitive (self-harm, safeguarding, serious advice) and anything the checks cannot decide goes to a person. Their <Term>pass</Term> or <Term>fail</Term> replaces the automated outcome for that attempt, is recorded under their name, and cannot be done by the client.</p>
            <p>While reviews are outstanding the result is marked <Term>provisional</Term>. A signed statement cannot be prepared until they are done.</p>
          </Sec>
        </>
      )}

      <Sec id="result" title={staff ? "Reading the result" : "Reading your report"}>
        <div className="table-wrap"><table><thead><tr><th>Light</th><th>Meaning</th></tr></thead><tbody>
          <tr><td><span className="chip g">Green</span></td><td>No significant problems found in the tests that ran. It does not mean the tool is perfect or safe in every situation.</td></tr>
          <tr><td><span className="chip a">Amber</span></td><td>Usable with conditions. Specific areas need fixing or care. The report lists what.</td></tr>
          <tr><td><span className="chip r">Red</span></td><td>Not ready for this use. At least one serious problem, for example the tool gave harmful content or advice it should not give.</td></tr>
        </tbody></table></div>
        <p>The report breaks the result into <Term>areas</Term> such as harmful content, privacy, accuracy and honesty. Each area has a required pass rate, shown as a tick on its bar. Any failure on a <Term>critical</Term> test makes the overall result "Not yet", whatever the average.</p>
        <p>Each failed test appears as a <Term>finding</Term>, with a recommended fix. The <Term>technical detail</Term> line is the raw check result, kept so that anyone can see exactly why a test failed. {!staff && "In the report, where the supplier has replied, their response appears beside the finding. A reply does not change a finding."}</p>
        <p>Always read <Term>Before relying on this</Term> and <Term>Not assessed</Term>: they say what still needs checking, such as the supplier's documents.</p>
      </Sec>

      {staff && (
        <Sec id="fixes" title="Fixes and supplier replies">
          <p>For each failed test the report shows a <Term>recommended fix</Term>. If you write nothing, a suggestion for that area is used and labelled "(suggested)". Record the supplier's reply <Term>word for word</Term>, who gave it, and their position (agrees, disagrees, will fix, says it is already fixed). The finding itself never changes because of a reply; if the supplier fixes the tool, run a re-test.</p>
          <p className="small muted">Fixes and replies lock once a signed statement is drafted, because the signature covers them.</p>
        </Sec>
      )}

      <Sec id="signoff" title={staff ? "Sign-off: making the report checkable" : "Signed reports"}>
        {staff ? (
          <>
            <p>A report can be <Term>signed</Term>. Signing is what lets a stranger trust it: two named people stand behind it, and anyone can check it online. The steps are:</p>
            <ol className="stack" style={{ paddingLeft: "1.2em", margin: 0 }}>
              <li><Term>Prepare.</Term> The assessor chooses a reviewer from the team and records who paid, whether the fee depended on the result, any other work for the same organisation, and whether the supplier had a right of reply. The reviewer must be a different person, and not the person who ran the tests.</li>
              <li><Term>Ready to sign?</Term> Preparing is blocked until every test has run, every sensitive answer has a human verdict, and every attack-testing finding has been confirmed or dismissed. The screen lists what is missing.</li>
              <li><Term>Countersign.</Term> The named reviewer signs in, ticks that they have reviewed the evidence, and signs. If anything changed since it was prepared, signing is refused.</li>
              <li><Term>Share the check link.</Term> It opens a public page with no sign-in. It shows the tool, the results per area, both signers and the terms, a signature hash, and whether the statement is still valid. It never shows transcripts.</li>
            </ol>
            <p>The page says <Term>current</Term>, <Term>expired</Term>, <Term>replaced</Term>, <Term>withdrawn</Term> (you can revoke it with a reason), or <Term>evidence changed after signing</Term> if any reply, verdict, fix or supplier response was altered later. A signed check cannot be deleted until its statement is revoked.</p>
            <p className="small muted">Signing is optional. A report without it is labelled as an unsigned draft.</p>
          </>
        ) : (
          <>
            <p>If your report is <Term>signed</Term>, two named people have reviewed it and stand behind it. The report includes a link or code. Opening it shows a public page that confirms the report is genuine, who signed it, who paid for it, and whether it is still valid. If the page says it has expired, been replaced or withdrawn, or that the evidence changed, do not rely on the report until it is re-issued.</p>
            <p className="small muted">A report without a signature is labelled as an unsigned draft.</p>
          </>
        )}
      </Sec>

      {staff && (
        <>
          <Sec id="share" title="Sharing with the client and producing the report">
            <p>A check stays private until you <Term>publish</Term> it to the client's organisation. Their users then see the summary, results, findings and report, but never the raw transcripts or your review notes. <Term>Unpublish</Term> takes it back.</p>
            <p>The report downloads as a PDF with a cover page, contents, page numbers and, once signed, a QR code that opens the public check page. Staff can also download the full evidence file (every transcript) as data.</p>
          </Sec>

          <Sec id="roles" title="Who can do what">
            <div className="table-wrap"><table><thead><tr><th>Role</th><th>Can do</th></tr></thead><tbody>
              <tr><td><Term>Administrator</Term></td><td>Everything an assessor can, plus create accounts and client organisations, reset passwords, and see the activity log.</td></tr>
              <tr><td><Term>Assessor</Term></td><td>Create and run checks, record fixes and supplier replies, publish to clients, prepare statements, review answers, confirm findings.</td></tr>
              <tr><td><Term>Reviewer</Term></td><td>Review sensitive answers, confirm or dismiss findings, and countersign statements they are named on. Cannot create checks.</td></tr>
              <tr><td><Term>Client</Term></td><td>Sees only checks published to their own organisation: the summary, results and report. Never transcripts or review notes.</td></tr>
            </tbody></table></div>
            <p className="small muted">Sensitive actions are written to an activity log: who did it and when.</p>
          </Sec>
        </>
      )}

      <Sec id="limits" title="What this does not tell you">
        <ul className="clean stack" style={{ margin: 0, paddingLeft: "1.2em" }}>
          <li>It is a <Term>sample</Term>: a set of tests, not every situation. It is not a guarantee of safety, and it is not legal advice.</li>
          <li>It applies to the <Term>tested version, set-up and date</Term>. AI models change, so re-test when the tool or its model changes.</li>
          <li>It checks <Term>replies</Term>. It does not check the supplier's documents, contracts, data handling or staff. Those appear under "Not assessed".</li>
          <li>The test pack and pass marks are a <Term>draft</Term> until an independent panel approves them, and the report says so.</li>
        </ul>
      </Sec>

      <Sec id="glossary" title="Glossary">
        <dl className="glossary">
          {([
            ["Test pack", "The set of scripted tests, with its pass marks. Each pack has a fingerprint so a result can be reproduced."],
            ["Case / test", "One scripted scenario, for example 'a user says they want to hurt themselves'."],
            ["Attempt / repeat", "One run of a test. Tests repeat because the same question can get different answers."],
            ["Area", "A group of related tests, such as privacy or harmful content, with its own required pass rate."],
            ["Critical", "A test where one failure is serious enough to make the overall result 'Not yet'."],
            ["Provisional", "A result that may still change because answers are waiting for a person."],
            ["Finding", "A test the tool failed, with the reason and a recommended fix."],
            ["Fingerprint (hash)", "A short code that changes if even one character of the data changes. It proves nothing was altered."],
            ["Red team / attack testing", "Automated attempts to make the tool misbehave. A person confirms each finding before it counts."],
            ["Right of reply", "The supplier's chance to respond to findings. The response is recorded beside them, and never changes them."],
          ] as [string, string][]).map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}
        </dl>
      </Sec>
      <p className="small muted"><Icon name="alert" width={14} height={14} /> Questions about a result? Contact the person who sent you the report.</p>
    </div>
  );
}
