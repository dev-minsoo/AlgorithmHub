import type { PlatformId } from "../types/domain";
import { PLATFORM_IDS } from "../platforms";

const SOLVED_SUMMARY_KEY = "solvedSummary";

export type SolvedSummary = Record<PlatformId, string[]>;

export async function getSolvedSummary(): Promise<SolvedSummary> {
  const stored = await chrome.storage.local.get(SOLVED_SUMMARY_KEY);
  const summary = stored[SOLVED_SUMMARY_KEY] as SolvedSummary | undefined;

  return PLATFORM_IDS.reduce((nextSummary, platform) => {
    nextSummary[platform] = summary?.[platform] ?? [];
    return nextSummary;
  }, {} as SolvedSummary);
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
