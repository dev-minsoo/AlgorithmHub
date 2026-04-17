import { getPendingGitHubWebAuth } from "../../core/storage/auth";
import type { RuntimeMessage, RuntimeMessageResponse } from "../../core/types/messages";

function getAuthParams() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");
  const error = params.get("error");

  if (!code && !error) {
    return null;
  }

  return { code, state, error };
}

export async function handleGitHubOAuthCallback() {
  if (window.location.hostname !== "github.com") {
    return false;
  }

  const authParams = getAuthParams();
  if (!authParams) {
    return false;
  }

  const pending = await getPendingGitHubWebAuth();
  if (!pending) {
    return false;
  }

  const response = (await chrome.runtime.sendMessage({
    type: "COMPLETE_GITHUB_WEB_AUTH",
    code: authParams.code,
    state: authParams.state,
    error: authParams.error,
  } satisfies RuntimeMessage)) as RuntimeMessageResponse;

  if (response.type === "GITHUB_WEB_AUTH_RESULT" && !response.ok) {
    document.title = "AlgorithmHub auth failed";
    document.body.innerHTML =
      `<main style="font-family:system-ui,sans-serif;padding:32px;color:#111">GitHub authentication failed: ${response.reason}</main>`;
  }

  return true;
}
