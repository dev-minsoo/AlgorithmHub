import { DEFAULT_SETTINGS, getSettings, saveSettings } from "../../core/storage/settings";
import {
  getPendingGitHubWebAuth,
  setPendingGitHubWebAuth,
  setWelcomeMode,
} from "../../core/storage/auth";
import { setCachedGitHubRepositories } from "../../core/storage/repositories";
import {
  getSolvedSummary,
  saveSolvedSummary,
  withSolvedProblem,
  type SolvedSummary,
} from "../../core/storage/summary";
import { saveUploadRecord } from "../../core/storage/uploads";
import {
  createGitHubClient,
  exchangeGitHubOAuthCode,
} from "../../core/github/client";
import { executeUploadJob } from "../../core/upload/execute";
import { PLATFORM_DEFINITIONS, PLATFORM_IDS } from "../../core/platforms";
import type { RuntimeMessage, RuntimeMessageResponse } from "../../core/types/messages";
import type { ProblemNoteRequest, UploadJob } from "../../core/types/upload";

const EXTENSION_NAME = "AlgorithmHub";
const GITHUB_OAUTH_REDIRECT_URI = "https://github.com/";
const GITHUB_OAUTH_CLIENT_SECRET = "a223258ea8e316e47ee81988e85cada899cfb2d4";
const INITIAL_REPOSITORY_COMMIT_MESSAGE = "Initial commit - AlgorithmHub";

function createPlatformSummaryRows(summary?: SolvedSummary) {
  return PLATFORM_IDS.map((platform) => {
    const definition = PLATFORM_DEFINITIONS[platform];
    const count = summary ? new Set(summary[platform]).size : 0;
    return `| ${definition.displayName} | ${count} |`;
  }).join("\n");
}

function createPlatformLinks() {
  return PLATFORM_IDS.map((platform) => {
    const definition = PLATFORM_DEFINITIONS[platform];
    return `- [${definition.displayName}](${encodeURI(`./${definition.rootLabel}`)})`;
  }).join("\n");
}

function countSolvedProblems(summary: SolvedSummary) {
  return PLATFORM_IDS.reduce(
    (total, platform) => total + new Set(summary[platform]).size,
    0
  );
}

function createRepositoryReadme(name: string) {
  return `# ${name}

Archive of accepted coding challenge solutions, synced by [AlgorithmHub](https://github.com/dev-minsoo/AlgorithmHub).

## Summary

| Platform | Solved |
| --- | ---: |
${createPlatformSummaryRows()}
| Total | 0 |

## Platforms

${createPlatformLinks()}
`;
}

function createRootSummaryReadme(
  repositoryName: string,
  summary: SolvedSummary
) {
  const totalCount = countSolvedProblems(summary);

  return `# ${repositoryName}

Archive of accepted coding challenge solutions, synced by [AlgorithmHub](https://github.com/dev-minsoo/AlgorithmHub).

## Summary

| Platform | Solved |
| --- | ---: |
${createPlatformSummaryRows(summary)}
| Total | ${totalCount} |

## Platforms

${createPlatformLinks()}
`;
}

function withRootSummaryReadme(
  job: UploadJob,
  settings: Awaited<ReturnType<typeof getSettings>>,
  summary: SolvedSummary
): UploadJob {
  const repositoryName =
    settings.github.repository.trim().split("/").pop() || "AlgorithmHub";

  return {
    ...job,
    rootFiles: [
      {
        path: "README.md",
        content: createRootSummaryReadme(repositoryName, summary),
      },
    ],
  };
}

function formatNoteDate(date = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function formatProblemNote(note: string) {
  const lines = note
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error("Add at least one line to save a note.");
  }

  return `## ${formatNoteDate()}\n\n${lines.map((line) => `- ${line}`).join("\n")}`;
}

function appendProblemNote(existingContent: string | null, note: string) {
  const nextEntry = formatProblemNote(note);
  if (!existingContent?.trim()) {
    return `${nextEntry}\n`;
  }

  return `${existingContent.trimEnd()}\n\n${nextEntry}\n`;
}

function formatProblemNoteCommitMessage(payload: ProblemNoteRequest) {
  return `[Note] ${payload.title} - AlgorithmHub`;
}

function openWelcomePage() {
  const url = chrome.runtime.getURL("welcome.html");
  void chrome.tabs.create({ url, active: true });
}

function isGitHubApiErrorWithStatus(error: unknown, status: number) {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status?: number }).status === status
  );
}

async function ensureRepositoryInitialized(
  github: ReturnType<typeof createGitHubClient>,
  repositoryFullName: string,
  defaultBranch: string
) {
  try {
    await github.getReference(repositoryFullName, defaultBranch);
    return;
  } catch (error) {
    if (!isGitHubApiErrorWithStatus(error, 409)) {
      throw error;
    }
  }

  const repositoryName = repositoryFullName.split("/").pop() || repositoryFullName;
  await github.createRepositoryFile(
    repositoryFullName,
    "README.md",
    createRepositoryReadme(repositoryName),
    INITIAL_REPOSITORY_COMMIT_MESSAGE,
    defaultBranch
  );
  await github.updateRepository(repositoryFullName, {
    description:
      "Archive of accepted coding challenge solutions, synced by AlgorithmHub.",
  });
}

async function handleSettingsMessage(): Promise<RuntimeMessageResponse> {
  const settings = await getSettings();
  return { type: "SETTINGS_STATE", settings };
}

async function handleSaveSettingsMessage(
  message: Extract<RuntimeMessage, { type: "SAVE_SETTINGS" }>
): Promise<RuntimeMessageResponse> {
  const settings = await saveSettings(message.settings);
  return { type: "SETTINGS_SAVED", settings };
}

function toRepositoryInfo(repository: {
  full_name: string;
  default_branch: string;
  private: boolean;
}) {
  return {
    fullName: repository.full_name,
    defaultBranch: repository.default_branch,
    private: repository.private,
  };
}

function createWebAuthState() {
  return `${Date.now()}-${crypto.randomUUID()}`;
}

async function handleStartGitHubWebAuth(
  message: Extract<RuntimeMessage, { type: "START_GITHUB_WEB_AUTH" }>
): Promise<RuntimeMessageResponse> {
  const settings = await getSettings();
  const clientId = settings.github.oauthClientId.trim();

  if (!clientId) {
    return {
      type: "GITHUB_WEB_AUTH_START",
      ok: false,
      reason: "GitHub OAuth client ID is required.",
    };
  }

  const state = createWebAuthState();
  await setPendingGitHubWebAuth({
    state,
    createdAt: Date.now(),
    nextMode: message.nextMode,
  });

  const url =
    `https://github.com/login/oauth/authorize` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(GITHUB_OAUTH_REDIRECT_URI)}` +
    `&scope=${encodeURIComponent("repo")}` +
    `&state=${encodeURIComponent(state)}`;

  return {
    type: "GITHUB_WEB_AUTH_START",
    ok: true,
    url,
  };
}

async function handleCompleteGitHubWebAuth(
  message: Extract<RuntimeMessage, { type: "COMPLETE_GITHUB_WEB_AUTH" }>,
  tabId?: number
): Promise<RuntimeMessageResponse> {
  const pending = await getPendingGitHubWebAuth();

  if (!pending) {
    return {
      type: "GITHUB_WEB_AUTH_RESULT",
      ok: false,
      reason: "No pending GitHub authentication was found.",
    };
  }

  if (message.error) {
    await setPendingGitHubWebAuth(null);
    return {
      type: "GITHUB_WEB_AUTH_RESULT",
      ok: false,
      reason: message.error,
    };
  }

  if (!message.code) {
    await setPendingGitHubWebAuth(null);
    return {
      type: "GITHUB_WEB_AUTH_RESULT",
      ok: false,
      reason: "GitHub did not return an authorization code.",
    };
  }

  if (message.state !== pending.state) {
    await setPendingGitHubWebAuth(null);
    return {
      type: "GITHUB_WEB_AUTH_RESULT",
      ok: false,
      reason: "GitHub OAuth state did not match.",
    };
  }

  const settings = await getSettings();
  const clientId = settings.github.oauthClientId.trim();

  if (!clientId) {
    await setPendingGitHubWebAuth(null);
    return {
      type: "GITHUB_WEB_AUTH_RESULT",
      ok: false,
      reason: "GitHub OAuth client ID is required.",
    };
  }

  try {
    const nextMode = pending.nextMode;
    const tokenPayload = await exchangeGitHubOAuthCode(
      clientId,
      GITHUB_OAUTH_CLIENT_SECRET,
      message.code,
      GITHUB_OAUTH_REDIRECT_URI
    );
    const github = createGitHubClient(tokenPayload.access_token);
    const user = await github.getCurrentUser();
    const repositories = await github.listRepositories();
    const nextSettings = await saveSettings({
      github: {
        token: tokenPayload.access_token,
        username: user.login,
      },
    });
    await setCachedGitHubRepositories(repositories.map(toRepositoryInfo));

    await setPendingGitHubWebAuth(null);

    if (typeof tabId === "number") {
      void chrome.tabs.remove(tabId);
    }

    await setWelcomeMode(nextMode ?? null);
    openWelcomePage();

    return {
      type: "GITHUB_WEB_AUTH_RESULT",
      ok: true,
      settings: nextSettings,
    };
  } catch (error) {
    await setPendingGitHubWebAuth(null);
    return {
      type: "GITHUB_WEB_AUTH_RESULT",
      ok: false,
      reason: error instanceof Error ? error.message : "GitHub authentication failed.",
    };
  }
}

async function handleCreateGitHubRepository(
  message: Extract<RuntimeMessage, { type: "CREATE_GITHUB_REPOSITORY" }>
): Promise<RuntimeMessageResponse> {
  const settings = await getSettings();
  const token = settings.github.token.trim();

  if (!token) {
    return {
      type: "GITHUB_REPOSITORY_UPDATE",
      ok: false,
      reason: "Authenticate with GitHub first.",
    };
  }

  try {
    const github = createGitHubClient(token);
    const repository = await github.createRepository(message.name.trim(), message.private);
    await github.createRepositoryFile(
      repository.full_name,
      "README.md",
      createRepositoryReadme(message.name.trim()),
      INITIAL_REPOSITORY_COMMIT_MESSAGE,
      repository.default_branch
    );
    const nextSettings = await saveSettings({
      github: {
        repository: repository.full_name,
        branch: repository.default_branch,
      },
    });

    return {
      type: "GITHUB_REPOSITORY_UPDATE",
      ok: true,
      settings: nextSettings,
      repository: toRepositoryInfo(repository),
    };
  } catch (error) {
    return {
      type: "GITHUB_REPOSITORY_UPDATE",
      ok: false,
      reason: error instanceof Error ? error.message : "Failed to create repository.",
    };
  }
}

async function handleListGitHubRepositories(): Promise<RuntimeMessageResponse> {
  const settings = await getSettings();
  const token = settings.github.token.trim();

  if (!token) {
    return {
      type: "GITHUB_REPOSITORIES",
      ok: false,
      reason: "Authenticate with GitHub first.",
    };
  }

  try {
    const github = createGitHubClient(token);
    const repositories = await github.listRepositories();
    const repositoryInfos = repositories.map(toRepositoryInfo);
    await setCachedGitHubRepositories(repositoryInfos);

    return {
      type: "GITHUB_REPOSITORIES",
      ok: true,
      repositories: repositoryInfos,
    };
  } catch (error) {
    return {
      type: "GITHUB_REPOSITORIES",
      ok: false,
      reason: error instanceof Error ? error.message : "Failed to load repositories.",
    };
  }
}

async function handleLinkGitHubRepository(
  message: Extract<RuntimeMessage, { type: "LINK_GITHUB_REPOSITORY" }>
): Promise<RuntimeMessageResponse> {
  const settings = await getSettings();
  const token = settings.github.token.trim();

  if (!token) {
    return {
      type: "GITHUB_REPOSITORY_UPDATE",
      ok: false,
      reason: "Authenticate with GitHub first.",
    };
  }

  try {
    const input = message.repository.trim();
    const repositoryName = input.includes("/")
      ? input
      : settings.github.username
        ? `${settings.github.username}/${input}`
        : input;
    const github = createGitHubClient(token);
    const repository = await github.getRepository(repositoryName);
    await ensureRepositoryInitialized(
      github,
      repository.full_name,
      repository.default_branch
    );
    const nextSettings = await saveSettings({
      github: {
        repository: repository.full_name,
        branch: repository.default_branch,
      },
    });

    return {
      type: "GITHUB_REPOSITORY_UPDATE",
      ok: true,
      settings: nextSettings,
      repository: toRepositoryInfo(repository),
    };
  } catch (error) {
    return {
      type: "GITHUB_REPOSITORY_UPDATE",
      ok: false,
      reason: error instanceof Error ? error.message : "Failed to link repository.",
    };
  }
}

async function handleDisconnectGitHubRepository(): Promise<RuntimeMessageResponse> {
  const settings = await saveSettings({
    github: {
      repository: "",
      branch: "",
    },
  });

  return {
    type: "SETTINGS_SAVED",
    settings,
  };
}

async function handleUploadJobMessage(
  message: Extract<RuntimeMessage, { type: "UPLOAD_JOB" }>
): Promise<RuntimeMessageResponse> {
  try {
    const settings = await getSettings();
    const summary = await getSolvedSummary();
    const nextSummary = withSolvedProblem(
      summary,
      message.job.platform,
      message.job.problemId
    );
    const job = withRootSummaryReadme(message.job, settings, nextSummary);
    const record = await executeUploadJob(job, settings);
    await saveUploadRecord(record);
    await saveSolvedSummary(nextSummary);

    return {
      type: "UPLOAD_RESULT",
      ok: true,
      record,
    };
  } catch (error) {
    return {
      type: "UPLOAD_RESULT",
      ok: false,
      jobId: message.job.id,
      reason: error instanceof Error ? error.message : "Upload failed.",
    };
  }
}

async function handleAppendProblemNoteMessage(
  message: Extract<RuntimeMessage, { type: "APPEND_PROBLEM_NOTE" }>
): Promise<RuntimeMessageResponse> {
  const settings = await getSettings();
  const token = settings.github.token.trim();
  const repository = settings.github.repository.trim();

  if (!token || !repository) {
    return {
      type: "APPEND_PROBLEM_NOTE_RESULT",
      ok: false,
      problemId: message.payload.problemId,
      reason: "GitHub token and repository must be configured.",
    };
  }

  try {
    const github = createGitHubClient(token);
    const repo = await github.getRepository(repository);
    const branch = settings.github.branch.trim() || repo.default_branch;
    const notePath = `${message.payload.directory}/NOTE.md`;
    const existingContent = await github.getRepositoryFileContent(
      repository,
      notePath,
      branch
    );
    const job: UploadJob = {
      id: `note:${message.payload.platform}:${message.payload.problemId}:${Date.now()}`,
      platform: message.payload.platform,
      problemId: message.payload.problemId,
      title: message.payload.title,
      directory: message.payload.directory,
      commitMessage: formatProblemNoteCommitMessage(message.payload),
      files: [
        {
          path: "NOTE.md",
          content: appendProblemNote(existingContent, message.payload.note),
        },
      ],
      rootFiles: [],
    };
    const record = await executeUploadJob(job, settings);
    await saveUploadRecord(record);

    return {
      type: "APPEND_PROBLEM_NOTE_RESULT",
      ok: true,
      record,
    };
  } catch (error) {
    return {
      type: "APPEND_PROBLEM_NOTE_RESULT",
      ok: false,
      problemId: message.payload.problemId,
      reason: error instanceof Error ? error.message : "Failed to save note.",
    };
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  const { settings } = await chrome.storage.local.get("settings");

  if (!settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }

  console.log(`[${EXTENSION_NAME}] installed`);
});

chrome.runtime.onMessage.addListener(
  (
    message: RuntimeMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: RuntimeMessageResponse) => void
  ) => {
    void (async () => {
      switch (message.type) {
        case "PING":
          sendResponse({ type: "PONG", timestamp: Date.now() });
          return;
        case "START_GITHUB_WEB_AUTH":
          sendResponse(await handleStartGitHubWebAuth(message));
          return;
        case "COMPLETE_GITHUB_WEB_AUTH":
          sendResponse(await handleCompleteGitHubWebAuth(message, sender.tab?.id));
          return;
        case "GET_SETTINGS":
          sendResponse(await handleSettingsMessage());
          return;
        case "SAVE_SETTINGS":
          sendResponse(await handleSaveSettingsMessage(message));
          return;
        case "LIST_GITHUB_REPOSITORIES":
          sendResponse(await handleListGitHubRepositories());
          return;
        case "CREATE_GITHUB_REPOSITORY":
          sendResponse(await handleCreateGitHubRepository(message));
          return;
        case "LINK_GITHUB_REPOSITORY":
          sendResponse(await handleLinkGitHubRepository(message));
          return;
        case "DISCONNECT_GITHUB_REPOSITORY":
          sendResponse(await handleDisconnectGitHubRepository());
          return;
        case "UPLOAD_JOB":
          sendResponse(await handleUploadJobMessage(message));
          return;
        case "APPEND_PROBLEM_NOTE":
          sendResponse(await handleAppendProblemNoteMessage(message));
          return;
      }
    })();

    return true;
  }
);
