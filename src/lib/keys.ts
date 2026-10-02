// API keys for the tool under test (and the judge) live only in memory. A reload forgets them by design.
export interface RunKeys { apiKey?: string; judgeApiKey?: string }
const store = new Map<string, RunKeys>();
export const keys = {
  get: (runId: string) => store.get(runId),
  set: (runId: string, k: RunKeys) => { store.set(runId, k); },
  has: (runId: string) => store.has(runId),
};
