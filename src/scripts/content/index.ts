import { getAdapterForUrl } from "../../adapters";
import { handleGitHubOAuthCallback } from "./githubAuth";

void handleGitHubOAuthCallback();

const adapter = getAdapterForUrl(new URL(window.location.href));

if (adapter) {
  void adapter.boot({ platform: adapter.platform });
}
