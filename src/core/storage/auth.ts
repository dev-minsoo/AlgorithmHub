const GITHUB_WEB_AUTH_STATE_KEY = "githubWebAuthState";
const WELCOME_MODE_KEY = "welcomeMode";

export type PendingGitHubWebAuth = {
  state: string;
  createdAt: number;
  nextMode?: "link" | "new";
};

export async function getPendingGitHubWebAuth(): Promise<PendingGitHubWebAuth | null> {
  const stored = await chrome.storage.local.get(GITHUB_WEB_AUTH_STATE_KEY);
  return (stored[GITHUB_WEB_AUTH_STATE_KEY] as PendingGitHubWebAuth | undefined) ?? null;
}

export async function setPendingGitHubWebAuth(
  pending: PendingGitHubWebAuth | null
): Promise<void> {
  if (!pending) {
    await chrome.storage.local.remove(GITHUB_WEB_AUTH_STATE_KEY);
    return;
  }

  await chrome.storage.local.set({ [GITHUB_WEB_AUTH_STATE_KEY]: pending });
}

export async function setWelcomeMode(mode: "link" | "new" | null): Promise<void> {
  if (!mode) {
    await chrome.storage.local.remove(WELCOME_MODE_KEY);
    return;
  }

  await chrome.storage.local.set({ [WELCOME_MODE_KEY]: mode });
}

export async function consumeWelcomeMode(): Promise<"link" | "new" | null> {
  const stored = await chrome.storage.local.get(WELCOME_MODE_KEY);
  const mode = (stored[WELCOME_MODE_KEY] as "link" | "new" | undefined) ?? null;
  await chrome.storage.local.remove(WELCOME_MODE_KEY);
  return mode;
}
