import { addUploadFile, createUploadJob } from "../../core/upload/job";
import {
  buildRepositoryDirectory,
  getPlatformRootLabel,
  normalizePathSegment,
} from "../../core/path/template";
import { sendRuntimeMessage } from "../../shared/runtime";
import type { ExtensionSettings } from "../../core/types/domain";
import type { RuntimeMessageResponse } from "../../core/types/messages";
import type { ProblemNoteRequest, UploadJob } from "../../core/types/upload";
import type { PlatformAdapter } from "../types";
import { burstConfetti } from "../confetti";
import { openSyncedActionsModal } from "../problemActionsModal";
import {
  appendProblemNoteThroughBackground,
  uploadThroughBackground,
} from "../upload";

const HACKERRANK_SUBMISSION_EVENT = "algorithmhub:hackerrank-submission";
const STATUS_MARKER_ID = "algorithmhub-hackerrank-status-marker";
const BRIDGE_SCRIPT_ID = "algorithmhub-hackerrank-page-bridge";
const BACKUP_STATUS_CHECK_DELAY_MS = 90000;

const languageExtensions: Record<string, string> = {
  c: ".c",
  clojure: ".clj",
  cpp: ".cpp",
  cpp14: ".cpp",
  cpp20: ".cpp",
  csharp: ".cs",
  erlang: ".erl",
  go: ".go",
  haskell: ".hs",
  java: ".java",
  java8: ".java",
  java15: ".java",
  javascript: ".js",
  julia: ".jl",
  kotlin: ".kt",
  lua: ".lua",
  objectivec: ".m",
  perl: ".pl",
  php: ".php",
  pypy: ".py",
  pypy3: ".py",
  python: ".py",
  python3: ".py",
  r: ".r",
  ruby: ".rb",
  rust: ".rs",
  scala: ".scala",
  swift: ".swift",
  typescript: ".ts",
};

type HackerrankRoute = {
  contestSlug: string;
  challengeSlug: string;
};

type HackerrankSubmissionEvent = HackerrankRoute & {
  submissionId: string;
  submission?: HackerrankSubmissionModel;
};

type HackerrankTrack = {
  name?: string | null;
  slug?: string | null;
  track_name?: string | null;
  track_slug?: string | null;
};

type HackerrankSubmissionModel = {
  id: number;
  challenge_id: number;
  language: string;
  status: string;
  language_status?: number | null;
  status_code: number;
  solved: number;
  code: string;
  name: string;
  slug: string;
  challenge_slug?: string | null;
  contest_slug?: string | null;
  score?: string | null;
  display_score?: string | null;
  compile_status?: number | null;
  compile_message?: string | null;
  testcase_status?: number[];
  testcase_message?: string[];
  stderr?: string | null;
  codechecker_signal?: number[];
  codechecker_time?: number[];
  track?: HackerrankTrack | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type HackerrankChallengeModel = {
  id: number;
  slug: string;
  name: string;
  preview?: string | null;
  body_html?: string | null;
  problem_statement?: string | null;
  difficulty_name?: string | null;
  max_score?: number | null;
  track?: HackerrankTrack | null;
};

type HackerrankApiResponse<T> = {
  status: boolean;
  model: T;
};

type HackerrankProblemData = {
  submission: HackerrankSubmissionModel;
  challenge: HackerrankChallengeModel;
  route: HackerrankRoute;
};

type SyncedProblemContext = {
  settings: ExtensionSettings;
  job: UploadJob;
  repositoryUrl: string;
};

class HackerrankRequestError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`HackerRank request failed: ${status}`);
    this.name = "HackerrankRequestError";
    this.status = status;
  }
}

function isHackerrankProblemPage(url: URL) {
  return Boolean(
    url.hostname.includes("hackerrank.com") &&
      (url.pathname.match(/^\/challenges\/[^/]+\/problem\/?$/) ||
        url.pathname.match(/^\/contests\/[^/]+\/challenges\/[^/]+\/problem\/?$/))
  );
}

function parseHackerrankRoute(url = new URL(window.location.href)): HackerrankRoute | null {
  const contestMatch = url.pathname.match(
    /^\/contests\/([^/]+)\/challenges\/([^/]+)\/problem\/?$/
  );
  if (contestMatch?.[1] && contestMatch[2]) {
    return {
      contestSlug: contestMatch[1],
      challengeSlug: contestMatch[2],
    };
  }

  const challengeMatch = url.pathname.match(/^\/challenges\/([^/]+)\/problem\/?$/);
  if (challengeMatch?.[1]) {
    return {
      contestSlug: "master",
      challengeSlug: challengeMatch[1],
    };
  }

  return null;
}

function formatArchiveStamp(date = new Date()) {
  const format = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return format.format(date).replace(" ", "_");
}

function createArchiveFileName(extension: string) {
  return `${formatArchiveStamp()}${extension}`;
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function escapePipe(value: string) {
  return value.replace(/\|/g, "\\|");
}

function getLanguageExtension(language: string) {
  const normalized = language.trim().toLowerCase();
  const extension = languageExtensions[normalized];
  if (extension) {
    return extension;
  }

  const safeLanguage = normalizePathSegment(normalized).replace(/\s+/g, "-");
  return safeLanguage ? `.${safeLanguage}` : ".txt";
}

function getTrackRoot(data: HackerrankProblemData) {
  return (
    data.challenge.track?.track_name?.trim() ||
    data.submission.track?.track_name?.trim() ||
    "Practice"
  );
}

function getTrackName(data: HackerrankProblemData) {
  return (
    data.challenge.track?.name?.trim() ||
    data.submission.track?.name?.trim() ||
    "General"
  );
}

function getDifficulty(data: HackerrankProblemData) {
  return data.challenge.difficulty_name?.trim() || "N/A";
}

function getProblemLink(data: HackerrankProblemData) {
  const { contestSlug, challengeSlug } = data.route;
  if (contestSlug && contestSlug !== "master") {
    return `https://www.hackerrank.com/contests/${contestSlug}/challenges/${challengeSlug}/problem`;
  }

  return `https://www.hackerrank.com/challenges/${challengeSlug}/problem`;
}

function getProblemBody(data: HackerrankProblemData) {
  return (
    data.challenge.problem_statement?.trim() ||
    data.challenge.body_html?.trim() ||
    data.challenge.preview?.trim() ||
    "Problem statement is available on HackerRank."
  );
}

function formatTestSummary(submission: HackerrankSubmissionModel) {
  const statuses = submission.testcase_status ?? [];
  if (statuses.length === 0) {
    return "N/A";
  }

  const passedCount = statuses.filter((status) => status === 1).length;
  return `${passedCount}/${statuses.length} passed`;
}

function createProblemReadme(data: HackerrankProblemData) {
  const { submission, challenge } = data;
  const trackRoot = getTrackRoot(data);
  const trackName = getTrackName(data);
  const difficulty = getDifficulty(data);
  const maxScore =
    typeof challenge.max_score === "number" ? String(challenge.max_score) : "N/A";
  const displayScore = submission.display_score?.trim() || "N/A";
  const problemLink = getProblemLink(data);

  return `# ${submission.name}

> ${trackRoot} | ${trackName} | HackerRank

## Problem Overview

- Platform: HackerRank
- Domain: ${trackRoot}
- Track: ${trackName}
- Difficulty: ${difficulty}
- Problem ID: ${submission.challenge_id}
- Max Score: ${maxScore}
- Problem Link: [${problemLink}](${problemLink})

## Problem

${getProblemBody(data)}

## Submission

| Item | Value |
| --- | --- |
| Status | Accepted |
| Language | ${escapePipe(submission.language)} |
| Score | ${escapePipe(displayScore)} |
| Testcases | ${escapePipe(formatTestSummary(submission))} |
| Submission ID | ${submission.id} |

---

_Synced with AlgorithmHub_`;
}

function ensureStatusMarker() {
  let marker = document.getElementById(STATUS_MARKER_ID);

  if (marker) {
    return marker;
  }

  marker = document.createElement("span");
  marker.id = STATUS_MARKER_ID;
  marker.style.position = "fixed";
  marker.style.right = "24px";
  marker.style.bottom = "24px";
  marker.style.zIndex = "2147483647";
  marker.style.display = "inline-flex";
  marker.style.alignItems = "center";
  marker.style.gap = "6px";
  marker.style.padding = "8px 12px";
  marker.style.borderRadius = "999px";
  marker.style.boxShadow = "0 14px 34px rgba(0, 0, 0, 0.22)";
  marker.style.fontSize = "12px";
  marker.style.fontWeight = "700";
  marker.style.fontFamily =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  document.body.appendChild(marker);
  return marker;
}

function renderStatusContent(marker: HTMLElement, text: string) {
  marker.replaceChildren();

  const icon = document.createElement("span");
  icon.textContent = "✓";
  icon.style.fontWeight = "900";
  icon.style.lineHeight = "1";

  const label = document.createElement("span");
  label.textContent = text;

  marker.append(icon, label);
}

function setStatusLink(
  marker: HTMLElement,
  action?: () => void,
  title?: string
) {
  marker.onclick = null;

  if (!action) {
    marker.style.cursor = "default";
    marker.removeAttribute("title");
    return;
  }

  marker.style.cursor = "pointer";
  marker.title = title ?? "Open synced actions";
  marker.onclick = action;
}

function setInlineStatus(
  text: string,
  tone: "working" | "success" | "error",
  action?: () => void,
  actionTitle?: string
) {
  const marker = ensureStatusMarker();

  renderStatusContent(marker, text);
  setStatusLink(marker, tone === "success" ? action : undefined, actionTitle);

  if (tone === "working") {
    marker.style.background = "#1e293b";
    marker.style.color = "#fde68a";
    return;
  }

  if (tone === "success") {
    const rect = marker.getBoundingClientRect();
    burstConfetti({
      x: rect.left + rect.width / 2,
      y: Math.max(48, rect.top - 28),
    });
    marker.style.background = "#052e16";
    marker.style.color = "#bbf7d0";
    return;
  }

  marker.style.background = "#450a0a";
  marker.style.color = "#fecaca";
}

function clearInlineStatus() {
  document.getElementById(STATUS_MARKER_ID)?.remove();
}

async function getSettings() {
  const response = await sendRuntimeMessage<RuntimeMessageResponse>({
    type: "GET_SETTINGS",
  });

  if (!response || response.type !== "SETTINGS_STATE") {
    throw new Error("Failed to load extension settings.");
  }

  return response.settings;
}

async function isExtensionEnabled() {
  const stored = await chrome.storage.local.get(["extensionEnabled"]);
  return stored.extensionEnabled !== false;
}

async function fetchHackerrankApi<T>(path: string) {
  const response = await fetch(`https://www.hackerrank.com${path}`, {
    credentials: "include",
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new HackerrankRequestError(response.status);
  }

  const body = (await response.json()) as HackerrankApiResponse<T>;
  if (!body.status || !body.model) {
    throw new Error("HackerRank response did not include a model.");
  }

  return body.model;
}

async function getChallengeDetails(route: HackerrankRoute) {
  return fetchHackerrankApi<HackerrankChallengeModel>(
    `/rest/contests/${route.contestSlug}/challenges/${route.challengeSlug}`
  );
}

async function getChallengeDetailsWithFallback(
  route: HackerrankRoute,
  submission: HackerrankSubmissionModel
) {
  try {
    return await getChallengeDetails(route);
  } catch (error) {
    console.warn("[AlgorithmHub] HackerRank challenge metadata request failed.", error);
    return {
      id: submission.challenge_id,
      slug: submission.challenge_slug?.trim() || submission.slug || route.challengeSlug,
      name: submission.name,
      preview: null,
      body_html: null,
      problem_statement: null,
      difficulty_name: null,
      max_score: null,
      track: submission.track ?? null,
    };
  }
}

async function getSubmissionDetails(event: HackerrankSubmissionEvent) {
  return fetchHackerrankApi<HackerrankSubmissionModel>(
    `/rest/contests/${event.contestSlug}/challenges/${event.challengeSlug}/submissions/${event.submissionId}`
  );
}

function isAcceptedSubmission(submission: HackerrankSubmissionModel) {
  const normalizedStatus = submission.status?.trim().toLowerCase() ?? "";
  const testcaseStatuses = submission.testcase_status ?? [];
  const hasSuccessfulTestcaseResults = testcaseStatuses.length > 0;
  const hasFailedTestcase = testcaseStatuses.some((status) => status !== 1);
  const testcaseMessages = submission.testcase_message ?? [];
  const hasFailedTestcaseMessage = testcaseMessages.some(
    (message) => !/success/i.test(message)
  );
  const codecheckerSignals = submission.codechecker_signal ?? [];
  const hasCodecheckerSignal = codecheckerSignals.some((signal) => signal !== 0);
  const score = Number.parseFloat(submission.score ?? "");
  const displayScore = Number.parseFloat(submission.display_score ?? "");
  const hasPassingScore = score > 0 || displayScore > 0;
  const hasCompileErrorMessage = /compil|error|failed/i.test(
    submission.compile_message ?? ""
  );
  const hasStderr = Boolean(submission.stderr?.trim());

  return (
    normalizedStatus === "accepted" &&
    submission.solved === 1 &&
    submission.compile_status === 0 &&
    submission.language_status === 0 &&
    hasPassingScore &&
    hasSuccessfulTestcaseResults &&
    !hasCompileErrorMessage &&
    !hasStderr &&
    !hasFailedTestcase &&
    !hasFailedTestcaseMessage &&
    !hasCodecheckerSignal
  );
}

function isProcessingSubmission(submission: HackerrankSubmissionModel) {
  return (
    submission.status_code === 3 ||
    /processing|queued|running/i.test(submission.status)
  );
}

function getCurrentRouteForEvent(event: HackerrankSubmissionEvent): HackerrankRoute {
  const route = parseHackerrankRoute();
  if (route?.challengeSlug === event.challengeSlug) {
    return route;
  }

  return {
    contestSlug: event.contestSlug || "master",
    challengeSlug: event.challengeSlug,
  };
}

function buildUploadJob(data: HackerrankProblemData, settings: ExtensionSettings) {
  const { submission } = data;
  const challengeSlug =
    submission.challenge_slug?.trim() || submission.slug || data.route.challengeSlug;
  const safeTitle = normalizePathSegment(submission.name);
  const trackRoot = getTrackRoot(data);
  const trackName = getTrackName(data);
  const extension = getLanguageExtension(submission.language);
  const directory = buildRepositoryDirectory(settings.repositoryTemplate.hackerrank, {
    platform: getPlatformRootLabel("hackerrank"),
    level: trackRoot,
    id: String(submission.challenge_id),
    title: safeTitle,
  });
  const commitMessage = `[HackerRank][${trackRoot}][${trackName}] ${submission.name} - Score: ${
    submission.display_score?.trim() || "N/A"
  } - AlgorithmHub`;

  let job: UploadJob = createUploadJob({
    id: `hackerrank:${submission.id}`,
    platform: "hackerrank",
    problemId: String(submission.challenge_id),
    title: submission.name,
    directory,
    commitMessage,
    metadata: {
      submissionId: String(submission.id),
      challengeSlug,
      trackRoot,
      trackName,
      language: submission.language,
    },
  });

  job = addUploadFile(job, {
    path: `${normalizePathSegment(challengeSlug) || "solution"}${extension}`,
    content: submission.code,
  });

  job = addUploadFile(job, {
    path: `archives/${createArchiveFileName(extension)}`,
    content: submission.code,
  });

  if (settings.platforms.hackerrank.createProblemReadme) {
    job = addUploadFile(job, {
      path: "README.md",
      content: createProblemReadme(data),
    });
  }

  return job;
}

function parseHackerrankSubmissionEvent(event: Event) {
  if (!(event instanceof CustomEvent) || typeof event.detail !== "string") {
    return null;
  }

  try {
    const detail = JSON.parse(event.detail) as Partial<HackerrankSubmissionEvent>;
    if (!detail.submissionId || !detail.challengeSlug) {
      return null;
    }

    return {
      submissionId: detail.submissionId,
      contestSlug: detail.contestSlug || "master",
      challengeSlug: detail.challengeSlug,
      submission: detail.submission,
    };
  } catch {
    return null;
  }
}

function getBridgeScriptUrl() {
  if (typeof chrome === "undefined" || !chrome.runtime?.getURL) {
    return null;
  }

  return chrome.runtime.getURL("hackerrank-page-bridge.js");
}

function injectHackerrankBridge() {
  if (document.getElementById(BRIDGE_SCRIPT_ID)) {
    return;
  }

  const bridgeScriptUrl = getBridgeScriptUrl();
  if (!bridgeScriptUrl) {
    return;
  }

  const script = document.createElement("script");
  script.id = BRIDGE_SCRIPT_ID;
  script.src = bridgeScriptUrl;
  script.async = false;

  (document.head || document.documentElement).appendChild(script);
}

function createSubmissionController() {
  const processingSubmissionIds = new Set<string>();
  const syncingSubmissionIds = new Set<string>();
  const syncedSubmissionIds = new Set<string>();
  const backupStatusCheckTimeouts = new Map<string, number>();
  let latestSyncContext: SyncedProblemContext | null = null;

  function clearBackupStatusChecks() {
    backupStatusCheckTimeouts.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    backupStatusCheckTimeouts.clear();
  }

  function resetPageState() {
    processingSubmissionIds.clear();
    syncingSubmissionIds.clear();
    clearBackupStatusChecks();
    latestSyncContext = null;
    clearInlineStatus();
  }

  async function syncAcceptedSubmission(
    submissionEvent: HackerrankSubmissionEvent,
    submission: HackerrankSubmissionModel,
    settings: ExtensionSettings
  ) {
    if (!isAcceptedSubmission(submission)) {
      processingSubmissionIds.delete(submissionEvent.submissionId);
      clearInlineStatus();
      return;
    }

    if (
      syncedSubmissionIds.has(submissionEvent.submissionId) ||
      syncingSubmissionIds.has(submissionEvent.submissionId)
    ) {
      return;
    }

    syncingSubmissionIds.add(submissionEvent.submissionId);
    processingSubmissionIds.delete(submissionEvent.submissionId);
    const backupTimeoutId = backupStatusCheckTimeouts.get(submissionEvent.submissionId);
    if (backupTimeoutId) {
      window.clearTimeout(backupTimeoutId);
      backupStatusCheckTimeouts.delete(submissionEvent.submissionId);
    }
    latestSyncContext = null;
    setInlineStatus("Syncing...", "working");

    try {
      if (!(await isExtensionEnabled())) {
        clearInlineStatus();
        return;
      }

      const route = getCurrentRouteForEvent(submissionEvent);
      const challenge = await getChallengeDetailsWithFallback(route, submission);
      const job = buildUploadJob({ submission, challenge, route }, settings);
      const record = await Promise.all([uploadThroughBackground(job), wait(700)]).then(
        ([uploadRecord]) => uploadRecord
      );

      syncedSubmissionIds.add(submissionEvent.submissionId);
      latestSyncContext = {
        settings,
        job,
        repositoryUrl: `https://github.com/${record.repository}/tree/${record.branch}/${encodeURI(
          job.directory
        )}`,
      };
      setInlineStatus(
        "Synced",
        "success",
        () => {
          const context = latestSyncContext;
          if (!context) {
            return;
          }

          openSyncedActionsModal({
            locale: context.settings.locale,
            themeMode: context.settings.themeMode,
            title: context.job.title,
            onOpenRepository: () => {
              window.open(context.repositoryUrl, "_blank", "noopener,noreferrer");
            },
            onSaveNote: async (note: string) => {
              const payload: ProblemNoteRequest = {
                platform: context.job.platform,
                problemId: context.job.problemId,
                title: context.job.title,
                directory: context.job.directory,
                note,
              };

              await appendProblemNoteThroughBackground(payload);
            },
          });
        },
        "Open synced actions"
      );
    } finally {
      syncingSubmissionIds.delete(submissionEvent.submissionId);
    }
  }

  function scheduleBackupStatusCheck(
    submissionEvent: HackerrankSubmissionEvent,
    settings: ExtensionSettings
  ) {
    if (
      backupStatusCheckTimeouts.has(submissionEvent.submissionId) ||
      syncedSubmissionIds.has(submissionEvent.submissionId)
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      backupStatusCheckTimeouts.delete(submissionEvent.submissionId);

      void (async () => {
        if (
          syncedSubmissionIds.has(submissionEvent.submissionId) ||
          syncingSubmissionIds.has(submissionEvent.submissionId)
        ) {
          return;
        }

        try {
          const route = getCurrentRouteForEvent(submissionEvent);
          const submission = await getSubmissionDetails({
            ...submissionEvent,
            ...route,
          });

          if (isAcceptedSubmission(submission)) {
            await syncAcceptedSubmission(
              {
                ...submissionEvent,
                ...route,
              },
              submission,
              settings
            );
            return;
          }

          if (!isProcessingSubmission(submission)) {
            processingSubmissionIds.delete(submissionEvent.submissionId);
            clearInlineStatus();
          }
        } catch (error) {
          if (error instanceof HackerrankRequestError && error.status === 429) {
            console.info(
              "[AlgorithmHub] HackerRank backup status check was rate limited. Waiting for HackerRank page status updates."
            );
            return;
          }

          console.info(
            "[AlgorithmHub] HackerRank backup status check could not read a result yet."
          );
        }
      })();
    }, BACKUP_STATUS_CHECK_DELAY_MS);

    backupStatusCheckTimeouts.set(submissionEvent.submissionId, timeoutId);
  }

  return {
    handleSubmissionEvent: async (event: Event) => {
      const submissionEvent = parseHackerrankSubmissionEvent(event);
      if (!submissionEvent || syncedSubmissionIds.has(submissionEvent.submissionId)) {
        return;
      }

      try {
        const settings = await getSettings();

        if (
          !settings.platforms.hackerrank.enabled ||
          !settings.platforms.hackerrank.autoUpload
        ) {
          return;
        }

        if (!(await isExtensionEnabled())) {
          return;
        }

        if (
          submissionEvent.submission &&
          isAcceptedSubmission(submissionEvent.submission)
        ) {
          await syncAcceptedSubmission(submissionEvent, submissionEvent.submission, settings);
          return;
        }

        if (processingSubmissionIds.has(submissionEvent.submissionId)) {
          return;
        }

        if (
          submissionEvent.submission &&
          !isProcessingSubmission(submissionEvent.submission)
        ) {
          clearInlineStatus();
          return;
        }

        processingSubmissionIds.add(submissionEvent.submissionId);
        latestSyncContext = null;
        clearInlineStatus();
        scheduleBackupStatusCheck(submissionEvent, settings);
      } catch (error) {
        console.error("[AlgorithmHub] HackerRank sync failed.", error);
        if (submissionEvent) {
          processingSubmissionIds.delete(submissionEvent.submissionId);
        }
        latestSyncContext = null;
        setInlineStatus("Sync failed", "error");
      }
    },
    resetPageState,
  };
}

async function bindAutoUpload() {
  injectHackerrankBridge();
  const controller = createSubmissionController();
  window.addEventListener(
    HACKERRANK_SUBMISSION_EVENT,
    controller.handleSubmissionEvent as EventListener
  );
  return controller;
}

let hackerrankController: Awaited<ReturnType<typeof bindAutoUpload>> | null = null;

export const hackerrankAdapter: PlatformAdapter = {
  platform: "hackerrank",
  canHandle(url) {
    return isHackerrankProblemPage(url);
  },
  async boot() {
    console.info("[AlgorithmHub] HackerRank adapter booted.");
    hackerrankController = await bindAutoUpload();
  },
  onUrlChange(url) {
    if (!isHackerrankProblemPage(url)) {
      hackerrankController?.resetPageState();
    }
  },
};
