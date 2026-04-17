import type { PlatformId } from "../types/domain";

const SOLVED_SUMMARY_KEY = "solvedSummary";

export type SolvedSummary = Record<PlatformId, string[]>;

export async function getSolvedSummary(): Promise<SolvedSummary> {
  const stored = await chrome.storage.local.get(SOLVED_SUMMARY_KEY);
  const summary = stored[SOLVED_SUMMARY_KEY] as SolvedSummary | undefined;

  return {
    leetcode: summary?.leetcode ?? [],
    programmers: summary?.programmers ?? [],
  };
}

export async function saveSolvedSummary(summary: SolvedSummary): Promise<SolvedSummary> {
  await chrome.storage.local.set({ [SOLVED_SUMMARY_KEY]: summary });
  return summary;
}

export function withSolvedProblem(
  summary: SolvedSummary,
  platform: PlatformId,
  problemId: string
): SolvedSummary {
  const next = new Set(summary[platform]);
  next.add(problemId);

  return {
    ...summary,
    [platform]: [...next],
  };
}
