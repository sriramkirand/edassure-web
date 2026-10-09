export type Role = "admin" | "assessor" | "reviewer" | "client";
export type Mode = "api" | "manual" | "import" | "engine";
export type Light = "green" | "amber" | "red";
export type Audience = "learner" | "teacher" | "public" | "staff" | "vulnerable";
export type Sector = "education" | "public" | "hr" | "health" | "finance" | "legal" | "customer" | "other";

export interface User { id: string; email: string; name: string; role: Role; orgId: string | null; mustChange: boolean }
export interface Org { id: string; name: string; kind: string; users?: number; runs?: number; createdAt?: string }
export interface AdminUser { id: string; email: string; name: string; role: Role; orgId: string | null; orgName: string | null; disabled: boolean; mustChange: boolean; createdAt: string; lastLoginAt: string | null }
export interface Department { id: string; name: string; orgId: string; orgName: string; runs?: number }
export interface Pack { id: string; name: string; version: string; description: string; cases: number; areas: string[] }
export interface Progress { done: number; pending: number; total: number }

export interface TargetConfig { type: string; model?: string; mode?: string; label?: string; baseUrl?: string }
export interface RunMeta { client: string; tool: string; assessor: string; reviewer: string; intendedUse: string; ageRange: string; profile?: Audience | null; affects?: "information" | "decisions" | null; engine?: { name: string; version?: string; importedAt: string } | null }

export interface RunListItem { id: string; createdAt: string; packId: string; packVersion: string; mode: Mode; target: TargetConfig; meta: RunMeta; repeats: number; done: number; total: number; orgId: string | null; orgName: string | null; publishedAt: string | null; sector: Sector | null; departmentId: string | null; departmentName: string | null; light: Light | null; passRate: number | null; pendingReviews: number; critical: number }
export interface Run { id: string; createdAt: string; packId: string; packVersion: string; target: TargetConfig; judge: TargetConfig | null; repeats: number; meta: RunMeta; mode: Mode; orgId: string | null; orgName: string | null; publishedAt: string | null; sector: Sector | null; departmentId: string | null; departmentName: string | null; createdByName: string | null; progress: Progress; evidenceSource: string }

export interface Area { area: string; label: string; passed: number; failed: number; review: number; skipped: number; rate: number | null; minimum: number; criticalFailure: boolean; status: "Pass" | "Conditions" | "Fail" | "Not scored" }
export interface Finding { caseId: string; area: string; severity: "critical" | "high" | "medium" | "low"; description: string; prompt: string; reply: string; reason: string; failedAttempts: number; totalAttempts: number }
export interface Evaluation { outcome: "Pass" | "Pass with conditions" | "Not yet"; provisional: boolean; pendingReviews: number; areas: Area[]; findings: Finding[]; criticalCount: number; flakyCases: string[]; totalAttempts: number; completedAttempts: number }
export interface Summary { light: Light; headline: string; reasons: string[]; conditions: string[]; reviewBy: string }
export interface AdversarialItem { id: string; tool: string; category: string; severity: "critical" | "high" | "medium" | "low"; status: "open" | "confirmed" | "dismissed"; detail: string | null; prompt?: string | null; reply?: string | null }
export interface Adversarial { open: number; confirmed: number; dismissed: number; confirmedCritical: number; categories: string[]; items: AdversarialItem[] }
export interface Results { evaluation: Evaluation; summary: Summary; adversarial: Adversarial; progress: Progress }
export interface AdversarialFinding { id: string; tool: string; category: string; severity: "critical" | "high" | "medium" | "low"; prompt: string | null; reply: string | null; detail: string | null; status: "open" | "confirmed" | "dismissed"; reviewer: string | null; notes: string | null; reviewedAt: string | null }
export interface Artifact { id: string; kind: string; tool: string; toolVersion: string | null; filename: string | null; sha256: string | null; bytes: number | null; createdAt: string }

export interface CheckResult { type: string; outcome: string; detail: string }
export interface ReviewAttempt { id: number; caseId: string; attempt: number; area: string; severity: string; description: string; turns: string[]; replies: string[]; outcome: string; checks: CheckResult[]; error: string | null; needsHuman: boolean }
export interface ManualItem { attemptId: number; caseId: string; attempt: number; area: string; severity: string; description: string; turns: string[] }
export interface AuditRow { ts: string; userEmail: string | null; action: string; runId: string | null; detail: string | null }

export interface Declarations { payer: "client" | "supplier" | "other"; feeBasis: "fixed" | "other"; priorWork: string; rightOfReply: "offered" | "declined" | "not_offered"; showClient: boolean }
export interface StatementInfo {
  id: string; status: "awaiting" | "issued"; code: string | null; verifyUrl: string | null; preparedBy: string; preparedAt: string;
  reviewerId: string; reviewer: string; issuedAt: string | null; validUntil: string; contentHash: string | null; declarations: Declarations | null;
}
export type VerifyState = "valid" | "expired" | "superseded" | "revoked" | "evidence_changed";
export interface VerifyResult {
  state: VerifyState; tool: string; client: string | null; sector: string | null; outcome: string; light: Light; headline: string;
  areas: { label: string; status: Area["status"] }[]; pack: { name: string; version: string; ratified: boolean }; evidenceMode: string; attempts: number;
  issuedAt: string; validUntil: string; reviewBy: string; signedBy: { name: string; role: string }[];
  declarations: Pick<Declarations, "payer" | "feeBasis" | "rightOfReply"> & { priorWork: string }; contentHash: string; revokedReason: string | null;
}
