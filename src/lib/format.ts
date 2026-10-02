export const fmtDate = (s: string | null | undefined) => { if (!s) return ""; try { return new Date(s).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }); } catch { return s; } };
export const fmtDay = (s: string | null | undefined) => { if (!s) return ""; try { return new Date(s).toLocaleDateString("en-GB", { dateStyle: "medium" }); } catch { return s; } };
export const pct = (x: number | null) => (x == null ? "n/a" : Math.round(x * 100) + "%");
export const ROLE_LABEL: Record<string, string> = { admin: "Administrator", assessor: "Assessor", reviewer: "Reviewer", client: "Client" };
export const MODE_LABEL: Record<string, string> = { api: "Direct connection", manual: "Manual capture", import: "Imported spreadsheet" };
export const profileLabel = (p?: string | null) => (p === "learner" ? "Learner-facing" : p === "teacher" ? "Teacher-facing" : "All cases");
export const targetText = (t: { type: string; model?: string; mode?: string; label?: string }) =>
  t.type === "manual" ? (t.label ? `manual: ${t.label}` : "manual") : t.type + (t.model ? " / " + t.model : t.mode ? " / " + t.mode : "");
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
