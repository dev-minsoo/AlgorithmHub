import { addUploadFile, createUploadJob } from "../../core/upload/job";
import {
  buildRepositoryDirectory,
  getPlatformRootLabel,
  normalizePathSegment,
} from "../../core/path/template";
import { sendRuntimeMessage } from "../../shared/runtime";
import type { RuntimeMessageResponse } from "../../core/types/messages";
import type { ExtensionSettings } from "../../core/types/domain";
import type { ProblemNoteRequest, UploadJob } from "../../core/types/upload";
import type { PlatformAdapter } from "../types";
import { burstConfetti } from "../confetti";
import { openSyncedActionsModal } from "../problemActionsModal";
import {
  appendProblemNoteThroughBackground,
  uploadThroughBackground,
} from "../upload";

const SUBMIT_BUTTON_SELECTOR = '[data-e2e-locator="console-submit-button"]';
const SUBMISSION_RESULT_SELECTOR = '[data-e2e-locator="submission-result"]';
const STATUS_MARKER_ID = "algorithmhub-leetcode-status-marker";

const languageExtensions: Record<string, string> = {
  C: ".c",
  "C++": ".cpp",
  "C#": ".cs",
  Dart: ".dart",
  Elixir: ".ex",
  Erlang: ".erl",
  Go: ".go",
  Java: ".java",
  JavaScript: ".js",
  Javascript: ".js",
  Kotlin: ".kt",
  MySQL: ".sql",
  "MS SQL Server": ".sql",
  Oracle: ".sql",
  Pandas: ".py",
  PHP: ".php",
  Python: ".py",
  Python3: ".py",
  Racket: ".rkt",
  Ruby: ".rb",
  Rust: ".rs",
  Scala: ".scala",
  Swift: ".swift",
  TypeScript: ".ts",
};

type LeetCodeSubmissionDetails = {
  runtimeDisplay: string;
  runtimePercentile: number;
  memoryDisplay: string;
  memoryPercentile: number;
  code: string;
  statusCode: number;
  lang: { verboseName: string };
  question: {
    questionId: string;
    title: string;
    titleSlug: string;
    content: string;
    difficulty: string;
    topicTags: Array<{ name: string; slug: string }>;
    questionFrontendId?: string;
  };
  notes?: string | null;
};

type GraphQLResponse<T> = {
  data: T;
  errors?: Array<{ message: string }>;
};

type SyncedProblemContext = {
  settings: ExtensionSettings;
  job: UploadJob;
  repositoryUrl: string;
};

function isProblemPage(url: URL) {
  return url.hostname.includes("leetcode.com") && url.pathname.includes("/problems/");
}

function addLeadingZeros(value: string) {
  const length = value.split("-")[0]?.length ?? 0;
  if (length >= 4) {
    return value;
  }

  return `${"0".repeat(4 - length)}${value}`;
}

function getProblemSlug(details: LeetCodeSubmissionDetails) {
  const frontendId = details.question.questionFrontendId ?? details.question.questionId;
  return addLeadingZeros(`${frontendId}-${details.question.titleSlug}`);
}

function getProblemId(details: LeetCodeSubmissionDetails) {
  const frontendId = details.question.questionFrontendId ?? details.question.questionId;
  return addLeadingZeros(frontendId);
}

function getDifficultyLabel(details: LeetCodeSubmissionDetails) {
  const difficulty = details.question.difficulty.trim();
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();
}

function getLanguageExtension(details: LeetCodeSubmissionDetails) {
  const extension = languageExtensions[details.lang.verboseName];

  if (!extension) {
    throw new Error(`Unsupported LeetCode language: ${details.lang.verboseName}`);
  }

  return extension;
}

function formatStats(details: LeetCodeSubmissionDetails) {
  const runtimePercentile =
    Math.round((details.runtimePercentile + Number.EPSILON) * 100) / 100;
  const memoryPercentile =
    Math.round((details.memoryPercentile + Number.EPSILON) * 100) / 100;

  return `Time: ${details.runtimeDisplay} (${runtimePercentile}%), Space: ${details.memoryDisplay} (${memoryPercentile}%) - AlgorithmHub`;
}

function escapePipe(value: string) {
  return value.replace(/\|/g, "\\|");
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

function createProblemReadme(
  details: LeetCodeSubmissionDetails,
  submissionId: string
) {
  const questionUrl = `https://leetcode.com/problems/${details.question.titleSlug}/`;
  const difficulty = getDifficultyLabel(details);
  const problemId = getProblemId(details);
  const tags =
    details.question.topicTags
      .map((tag) => tag.name.trim())
      .filter(Boolean)
      .join(", ") || "N/A";

  return `# ${details.question.title}

> ${difficulty} | ${problemId} | LeetCode

## Problem Overview

- Platform: LeetCode
- Difficulty: ${difficulty}
- Problem ID: ${problemId}
- Tags: ${escapePipe(tags)}
- Problem Link: [${questionUrl}](${questionUrl})

## Problem

${details.question.content}

## Submission

| Item | Value |
| --- | --- |
| Status | Accepted |
| Language | ${escapePipe(details.lang.verboseName)} |
| Runtime | ${escapePipe(details.runtimeDisplay)} (${details.runtimePercentile.toFixed(2)}%) |
| Memory | ${escapePipe(details.memoryDisplay)} (${details.memoryPercentile.toFixed(2)}%) |
| Submission ID | ${submissionId} |

---

_Synced with AlgorithmHub_`;
}

function ensureStatusMarker() {
  let marker = document.getElementById(STATUS_MARKER_ID);

  if (marker) {
    return marker;
  }

  const result = document.querySelector<HTMLElement>(SUBMISSION_RESULT_SELECTOR);
  if (!result) {
    return null;
  }

  const anchor = result.parentElement ?? result;
  marker = document.createElement("span");
  marker.id = STATUS_MARKER_ID;
  marker.style.display = "inline-flex";
  marker.style.alignItems = "center";
  marker.style.gap = "6px";
  marker.style.marginLeft = "8px";
  marker.style.padding = "4px 10px";
  marker.style.borderRadius = "999px";
  marker.style.background = "#052e16";
  marker.style.color = "#bbf7d0";
  marker.style.fontSize = "12px";
  marker.style.fontWeight = "700";
  marker.style.verticalAlign = "middle";

  anchor.appendChild(marker);
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
  if (!marker) {
    return;
  }

  renderStatusContent(marker, text);
  setStatusLink(marker, tone === "success" ? action : undefined, actionTitle);

  if (tone === "working") {
    marker.style.background = "#1f2937";
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

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function isExtensionEnabled() {
  const stored = await chrome.storage.local.get(["extensionEnabled"]);
  return stored.extensionEnabled !== false;
}

async function fetchGraphQL<T>(
  query: string,
  variables: Record<string, unknown>,
  operationName: string
) {
  const response = await fetch("https://leetcode.com/graphql/", {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables,
      operationName,
    }),
  });

  if (!response.ok) {
    throw new Error(`LeetCode GraphQL request failed: ${response.status}`);
  }

  const body = (await response.json()) as GraphQLResponse<T>;
  if (body.errors?.length) {
    throw new Error(body.errors[0]?.message ?? "LeetCode GraphQL error");
  }

  return body.data;
}

async function getSubmissionDetails(submissionId: string) {
  const submissionDetailsQuery = `
    query submissionDetails($submissionId: Int!) {
      submissionDetails(submissionId: $submissionId) {
        runtimeDisplay
        runtimePercentile
        memoryDisplay
        memoryPercentile
        code
        statusCode
        lang {
          verboseName
        }
        question {
          questionId
          title
          titleSlug
          content
          difficulty
          topicTags {
            name
            slug
          }
        }
        notes
      }
    }
  `;

  const questionDetailsQuery = `
    query questionDetail($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        questionFrontendId
      }
    }
  `;

  const submissionData = await fetchGraphQL<{
    submissionDetails: LeetCodeSubmissionDetails;
  }>(submissionDetailsQuery, { submissionId: Number(submissionId) }, "submissionDetails");

  const titleSlug = submissionData.submissionDetails.question.titleSlug;
  const questionData = await fetchGraphQL<{
    question: { questionFrontendId: string };
  }>(questionDetailsQuery, { titleSlug }, "questionDetail");

  submissionData.submissionDetails.question.questionFrontendId =
    questionData.question.questionFrontendId;

  return submissionData.submissionDetails;
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

async function waitForSubmissionId(timeoutMs = 10000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const match = window.location.href.match(/\/submissions\/(?:detail\/)?(\d+)/);
    if (match?.[1]) {
      return match[1];
    }

    await new Promise((resolve) => window.setTimeout(resolve, 250));
  }

  return null;
}

async function waitForAcceptedState(timeoutMs = 12000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const result = document.querySelector<HTMLElement>(SUBMISSION_RESULT_SELECTOR);
    const text = result?.innerText.trim().toLowerCase() ?? "";
    if (text.includes("accepted") || text.includes("success")) {
      return true;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 500));
  }

  return false;
}

function buildUploadJob(
  details: LeetCodeSubmissionDetails,
  submissionId: string,
  settings: ExtensionSettings
) {
  const slug = getProblemSlug(details);
  const problemId = getProblemId(details);
  const difficulty = getDifficultyLabel(details);
  const extension = getLanguageExtension(details);
  const titleSegment = normalizePathSegment(details.question.title);
  const directory = buildRepositoryDirectory(settings.repositoryTemplate.leetcode, {
    platform: getPlatformRootLabel("leetcode"),
    level: difficulty,
    id: problemId,
    title: titleSegment,
  });
  const codeFileName = `${slug}${extension}`;
  const commitMessage = `[LeetCode][${difficulty}] ${slug} - ${formatStats(details)}`;

  let job: UploadJob = createUploadJob({
    id: `leetcode:${submissionId}`,
    platform: "leetcode",
    problemId,
    title: details.question.title,
    directory,
    commitMessage,
    metadata: {
      submissionId,
      titleSlug: details.question.titleSlug,
      difficulty,
    },
  });

  job = addUploadFile(job, {
    path: codeFileName,
    content: details.code,
  });

  job = addUploadFile(job, {
    path: `archives/${createArchiveFileName(extension)}`,
    content: details.code,
  });

  if (settings.platforms.leetcode.createProblemReadme) {
    job = addUploadFile(job, {
      path: "README.md",
      content: createProblemReadme(details, submissionId),
    });
  }

  if (settings.platforms.leetcode.attachNotes && details.notes?.trim()) {
    job = addUploadFile(job, {
      path: "NOTES.md",
      content: details.notes.trim(),
    });
  }

  return job;
}

function createSubmissionHandler() {
  const handledSubmissionIds = new Set<string>();
  let lastTriggerAt = 0;
  let latestSyncContext: SyncedProblemContext | null = null;

  return async function handleSubmissionTrigger() {
    try {
      const settings = await getSettings();

      if (!settings.platforms.leetcode.enabled || !settings.platforms.leetcode.autoUpload) {
        return;
      }

      if (!(await isExtensionEnabled())) {
        return;
      }

      const now = Date.now();
      if (now - lastTriggerAt < 1500) {
        return;
      }
      lastTriggerAt = now;

      const submissionId = await waitForSubmissionId();
      if (!submissionId || handledSubmissionIds.has(submissionId)) {
        return;
      }

      const accepted = await waitForAcceptedState();
      if (!accepted) {
        clearInlineStatus();
        return;
      }

      handledSubmissionIds.add(submissionId);
      if (!(await isExtensionEnabled())) {
        clearInlineStatus();
        return;
      }

      latestSyncContext = null;
      setInlineStatus("Syncing...", "working");
      const details = await getSubmissionDetails(submissionId);

      if (!String(details.statusCode).toLowerCase().includes("accepted") && details.statusCode !== 10) {
        throw new Error("Submission details are not marked as accepted.");
      }

      const job = buildUploadJob(details, submissionId, settings);
      const record = await Promise.all([uploadThroughBackground(job), wait(700)]).then(
        ([uploadRecord]) => uploadRecord
      );
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
    } catch {
      latestSyncContext = null;
      setInlineStatus("Sync failed", "error");
    }
  };
}

async function bindAutoUpload() {
  const handleSubmission = createSubmissionHandler();

  const observer = new MutationObserver(() => {
    const submitButton = document.querySelector<HTMLButtonElement>(SUBMIT_BUTTON_SELECTOR);
    const editor = document.querySelector<HTMLTextAreaElement>("textarea");

    if (!submitButton || submitButton.dataset.algorithmHubBound === "true") {
      return;
    }

    submitButton.dataset.algorithmHubBound = "true";
    submitButton.addEventListener("click", () => {
      void handleSubmission();
    });

    if (editor && editor.dataset.algorithmHubBound !== "true") {
      editor.dataset.algorithmHubBound = "true";
      editor.addEventListener("keydown", (event) => {
        const isMac = window.navigator.userAgent.includes("Mac");
        const isKeyboardSubmit =
          event.key === "Enter" &&
          ((isMac && event.metaKey) || (!isMac && event.ctrlKey));

        if (isKeyboardSubmit) {
          void handleSubmission();
        }
      });
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

export const leetCodeAdapter: PlatformAdapter = {
  platform: "leetcode",
  canHandle(url) {
    return isProblemPage(url);
  },
  async boot() {
    console.info("[AlgorithmHub] LeetCode adapter booted.");
    await bindAutoUpload();
  },
};
