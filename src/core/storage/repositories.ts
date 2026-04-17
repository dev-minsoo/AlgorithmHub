import type { RepositoryInfo } from "../types/domain";

const GITHUB_REPOSITORIES_KEY = "githubRepositories";

export async function getCachedGitHubRepositories(): Promise<RepositoryInfo[]> {
  const stored = await chrome.storage.local.get(GITHUB_REPOSITORIES_KEY);
  return (stored[GITHUB_REPOSITORIES_KEY] as RepositoryInfo[] | undefined) ?? [];
}

export async function setCachedGitHubRepositories(
  repositories: RepositoryInfo[]
): Promise<void> {
  await chrome.storage.local.set({ [GITHUB_REPOSITORIES_KEY]: repositories });
}
