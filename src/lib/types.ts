export type Role = "admin" | "assessor" | "reviewer" | "client";
export type Mode = "api" | "manual" | "import";
export type Light = "green" | "amber" | "red";

export interface User { id: string; email: string; name: string; role: Role; orgId: string | null; mustChange: boolean }
export interface Org { id: string; name: string; kind: string; users?: number; runs?: number; createdAt?: string }
export interface AdminUser { id: string; email: string; name: string; role: Role; orgId: string | null; orgName: string | null; disabled: boolean; mustChange: boolean; createdAt: string; lastLoginAt: string | null }
export interface Pack { id: string; name: string; version: string; description: string; cases: number; areas: string[] }
export interface Progress { done: number; pending: number; total: number }

export interface TargetConfig { type: string; model?: string; mode?: string; label?: string; baseUrl?: string }
export interface RunMeta { client: string; tool: string; assessor: string; reviewer: string; intendedUse: string; ageRange: string; profile?: "learner" | "teacher" | null }

export interface RunListItem { id: string; createdAt: string; packId: string; packVersion: string; mode: Mode; target: TargetConfig; meta: RunMeta; repeats: number; done: number; total: number; orgId: string | null; orgName: string | null; publishedAt: string | null; light: Light | null; passRate: number | null; pendingReviews: number; critical: number }
export interface Run { id: string; createdAt: string; packId: string; packVersion: string; target: TargetConfig; judge: TargetConfig | null; repeats: number; meta: RunMeta; mode: Mode; orgId: string | null; orgName: string | null; publishedAt: string | null; createdByName: string | null; progress: Progress; evidenceSource: string }

export interface Area { area: string; label: string; passed: number; failed: number; review: number; skipped: number; rate: number | null; minimum: number; criticalFailure: boolean; status: "Pass" | "Conditions" | "Fail" | "Not scored" }
export interface Finding { caseId: string; area: string; severity: "critical" | "high" | "medium" | "low"; description: string; prompt: string; reply: string; reason: string; failedAttempts: number; totalAttempts: number }
export interface Evaluation { outcome: "Pass" | "Pass with conditions" | "Not yet"; provisional: boolean; pendingReviews: number; areas: Area[]; findings: Finding[]; criticalCount: number; flakyCases: string[]; totalAttempts: number; completedAttempts: number }
export interface Summary { light: Light; headline: string; reasons: string[]; conditions: string[]; reviewBy: string }
export interface Results { evaluation: Evaluation; summary: Summary; progress: Progress }

export interface CheckResult { type: string; outcome: string; detail: string }
export interface ReviewAttempt { id: number; caseId: string; attempt: number; area: string; severity: string; description: string; turns: string[]; replies: string[]; outcome: string; checks: CheckResult[]; error: string | null; needsHuman: boolean }
export interface ManualItem { attemptId: number; caseId: string; attempt: number; area: string; severity: string; description: string; turns: string[] }
export interface AuditRow { ts: string; userEmail: string | null; action: string; runId: string | null; detail: string | null }
