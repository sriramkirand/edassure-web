export const fmtDate = (s: string | null | undefined) => { if (!s) return ""; try { return new Date(s).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" }); } catch { return s; } };
export const fmtDay = (s: string | null | undefined) => { if (!s) return ""; try { return new Date(s).toLocaleDateString("en-GB", { dateStyle: "medium", timeZone: "Europe/London" }); } catch { return s; } };
export const pct = (x: number | null) => (x == null ? "n/a" : Math.round(x * 100) + "%");
export const ROLE_LABEL: Record<string, string> = { admin: "Administrator", assessor: "Assessor", reviewer: "Reviewer", client: "Client" };
export const MODE_LABEL: Record<string, string> = { api: "Direct connection", manual: "Manual capture", import: "Imported spreadsheet", engine: "Open-source engine" };
export const PROFILE_LABEL: Record<string, string> = { learner: "Learner-facing", teacher: "Teacher-facing", public: "Public-facing", staff: "Staff-facing", vulnerable: "Used by vulnerable people" };
export const profileLabel = (p?: string | null) => (p && PROFILE_LABEL[p]) || "All cases";
export const SECTORS: { key: string; label: string; blurb: string }[] = [
  { key: "education", label: "Education", blurb: "Schools, trusts, colleges, universities" },
  { key: "public", label: "Public services", blurb: "Councils, central government, agencies" },
  { key: "hr", label: "HR and recruitment", blurb: "Hiring, staff support, people operations" },
  { key: "health", label: "Health and care", blurb: "Health admin, care providers" },
  { key: "finance", label: "Finance and insurance", blurb: "Banks, insurers, advisers" },
  { key: "legal", label: "Legal and professional", blurb: "Law firms, advisers" },
  { key: "customer", label: "Customer service", blurb: "Support and contact centres in any sector" },
  { key: "other", label: "Something else", blurb: "Any other organisation" },
];
export const SECTOR_LABEL: Record<string, string> = Object.fromEntries(SECTORS.map((x) => [x.key, x.label]));
export const ORG_KINDS = ["school", "trust", "college", "university", "council", "government", "nhs", "company", "charity", "supplier", "other"];
export const targetText = (t: { type: string; model?: string; mode?: string; label?: string }) =>
  t.type === "manual" ? (t.label ? `manual: ${t.label}` : "manual") : t.type + (t.model ? " / " + t.model : t.mode ? " / " + t.mode : "");
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Name to show for the client: the organisation, else the typed client name, else a clear "not set" instead of a [placeholder]. */
export const clientName = (r: { orgName: string | null; meta: { client: string } }) =>
  r.orgName || (r.meta.client && !r.meta.client.startsWith("[") ? r.meta.client : "No client set");
