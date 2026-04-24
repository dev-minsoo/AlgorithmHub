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

const STATUS_MARKER_ID = "algorithmhub-programmers-status-marker";

type ProgrammersProblemData = {
  problemId: string;
  title: string;
  level: string;
  category: string;
  descriptionHtml: string;
  language: string;
  languageExtension: string;
  code: string;
  resultMessage: string;
  runtime: string;
  memory: string;
  link: string;
};

type SyncedProblemContext = {
  settings: ExtensionSettings;
  job: UploadJob;
  repositoryUrl: string;
};

function isProgrammersProblemPage(url: URL) {
  return (
    url.hostname.includes("programmers.co.kr") &&
    url.pathname.includes("/learn/courses/") &&
    url.pathname.includes("/lessons/")
  );
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

  return format
    .format(date)
    .replace(" ", "_")
    .replaceAll(":", "-");
}

function createArchiveFileName(extension: string) {
  return `${formatArchiveStamp()}-${Date.now().toString().slice(-4)}.${extension}`;
}

function isSubmitButtonElement(button: HTMLButtonElement | null) {
  if (!button) {
    return false;
  }

  if (
    button.matches('button[data-test="submit-button"], button[data-testid="submit-button"], button.btn-submit')
  ) {
    return true;
  }

  return /제출|채점하기|submit/i.test(button.innerText);
}

function getAcceptedResultText() {
  const result = document.querySelector<HTMLElement>("div.modal-header > h4")
    ?? document.querySelector<HTMLElement>("#modal-dialog h4")
    ?? document.querySelector<HTMLElement>(".modal-header h4")
    ?? document.querySelector<HTMLElement>('[class*="modal"] h4');

  return result?.innerText.trim() ?? "";
}

function getStatusMarkerAnchor() {
  const modalFooter =
    document.querySelector<HTMLElement>(".modal-footer") ??
    document.querySelector<HTMLElement>("#modal-dialog .modal-footer") ??
    document.querySelector<HTMLElement>('[class*="modal"] .modal-footer');

  if (modalFooter) {
    const firstButton = modalFooter.querySelector<HTMLElement>("button, a");
    return {
      container: modalFooter,
      referenceButton: firstButton,
      mode: "footer" as const,
    };
  }

  const modalHeader =
    document.querySelector<HTMLElement>(".modal-header") ??
    document.querySelector<HTMLElement>("#modal-dialog .modal-header") ??
    document.querySelector<HTMLElement>('[class*="modal"] .modal-header');

  if (!modalHeader) {
    return null;
  }

  modalHeader.style.display = "flex";
  modalHeader.style.alignItems = "center";
  modalHeader.style.gap = "8px";

  const closeButton =
    modalHeader.querySelector<HTMLElement>('button.close, button[aria-label*="close" i]') ??
    modalHeader.querySelector<HTMLElement>("button");

  if (closeButton) {
    closeButton.style.flexShrink = "0";
    closeButton.style.marginLeft = "8px";
  }

  return {
    container: modalHeader,
    referenceButton: closeButton,
    mode: "header" as const,
  };
}

function ensureStatusMarker() {
  let marker = document.getElementById(STATUS_MARKER_ID);

  if (marker) {
    return marker;
  }

  const anchor = getStatusMarkerAnchor();
  if (!anchor) {
    return null;
  }

  marker = document.createElement("span");
  marker.id = STATUS_MARKER_ID;
  marker.style.display = "inline-flex";
  marker.style.alignItems = "center";
  marker.style.gap = "6px";
  marker.style.flexShrink = "0";
  marker.style.marginLeft = "0";
  marker.style.marginRight = "0";
  marker.style.padding = "4px 10px";
  marker.style.borderRadius = "999px";
  marker.style.fontSize = "12px";
  marker.style.fontWeight = "700";
  marker.style.verticalAlign = "middle";

  if (anchor.mode === "footer") {
    anchor.container.style.position = "relative";
    marker.style.position = "absolute";
    marker.style.left = "12px";
    marker.style.top = "50%";
    marker.style.transform = "translateY(-50%)";
    anchor.container.appendChild(marker);
  } else if (anchor.referenceButton?.parentElement === anchor.container) {
    anchor.container.insertBefore(marker, anchor.referenceButton);
  } else {
    anchor.container.appendChild(marker);
  }

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

function positionFooterMarker(marker: HTMLElement) {
  const footer =
    document.querySelector<HTMLElement>(".modal-footer") ??
    document.querySelector<HTMLElement>("#modal-dialog .modal-footer") ??
    document.querySelector<HTMLElement>('[class*="modal"] .modal-footer');
  const firstButton = footer?.querySelector<HTMLElement>("button, a");

  if (!footer || !firstButton) {
    return;
  }

  const desiredLeft = firstButton.offsetLeft - marker.offsetWidth - 10;
  const left = Math.max(12, desiredLeft);
  const top = firstButton.offsetTop + firstButton.offsetHeight / 2;

  marker.style.left = `${left}px`;
  marker.style.top = `${top}px`;
}

function scheduleFooterMarkerPosition(marker: HTMLElement) {
  const reposition = () => positionFooterMarker(marker);

  window.requestAnimationFrame(reposition);
  window.setTimeout(reposition, 0);
  window.setTimeout(reposition, 120);
}

async function prepareFooterStatusSlot() {
  const marker = ensureStatusMarker();
  if (!marker) {
    return;
  }

  if (marker.style.position === "absolute") {
    marker.style.visibility = "hidden";
    scheduleFooterMarkerPosition(marker);
    await wait(160);
    scheduleFooterMarkerPosition(marker);
    marker.style.visibility = "visible";
  }
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

  if (marker.style.position === "absolute") {
    scheduleFooterMarkerPosition(marker);
  }

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

function formatProgrammersLevel(level: string) {
  const normalized = level.trim().replace(/^lv\.?\s*/i, "");
  return `Lv. ${normalized}`;
}

function getDateString(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  const seconds = `${date.getSeconds()}`.padStart(2, "0");

  return `${year}년 ${month}월 ${day}일 ${hours}:${minutes}:${seconds}`;
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function escapePipe(value: string) {
  return value.replace(/\|/g, "\\|");
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

function getCodeFromEditor() {
  const codeMirrorElement = document.querySelector(".CodeMirror") as
    | (HTMLElement & { CodeMirror?: { getValue: () => string } })
    | null;

  if (codeMirrorElement?.CodeMirror) {
    return codeMirrorElement.CodeMirror.getValue();
  }

  const textarea = document.querySelector<HTMLTextAreaElement>("textarea#code");
  if (textarea?.value) {
    return textarea.value;
  }

  const fillBlankInputs = document.querySelectorAll<HTMLInputElement>(
    'input[name^="input_code"]'
  );
  if (fillBlankInputs.length > 0) {
    const container = fillBlankInputs[0]?.closest("pre");
    if (!container) {
      return "";
    }

    let result = "";
    const walk = (node: Node) => {
      for (const child of node.childNodes) {
        if (child instanceof HTMLInputElement) {
          result += child.value;
        } else if (child.childNodes.length > 0) {
          walk(child);
        } else {
          result += child.textContent ?? "";
        }
      }
    };

    walk(container);
    return result;
  }

  return "";
}

function parseRuntimeAndMemory() {
  const cells = [...document.querySelectorAll<HTMLTableCellElement>("td.result.passed")]
    .map((cell) => cell.innerText.replace(/[^., 0-9a-zA-Z]/g, "").trim())
    .map((text) => text.split(", "))
    .filter((pair) => pair.length >= 2);

  if (cells.length === 0) {
    return { runtime: "Unknown", memory: "Unknown" };
  }

  const best = cells.reduce((current, next) => {
    const currentRuntime = Number.parseFloat(current[0] ?? "0");
    const nextRuntime = Number.parseFloat(next[0] ?? "0");
    return currentRuntime > nextRuntime ? next : current;
  });

  return {
    runtime: (best[0] ?? "Unknown").replace(/(?<=[0-9])(?=[A-Za-z])/, " "),
    memory: (best[1] ?? "Unknown").replace(/(?<=[0-9])(?=[A-Za-z])/, " "),
  };
}

function parseResultMessage() {
  return (
    [...document.querySelectorAll<HTMLElement>("#output .console-message")]
      .map((node) => node.textContent?.trim() ?? "")
      .filter((text) => text.includes(":"))
      .join("<br/>") || "Empty"
  );
}

function parseProgrammersProblemData(): ProgrammersProblemData {
  const lessonElement =
    document.querySelector<HTMLElement>(".lesson-content") ??
    document.querySelector<HTMLElement>("[data-lesson-id]");

  if (!lessonElement) {
    throw new Error("Could not locate Programmers lesson metadata.");
  }

  const problemId = lessonElement.getAttribute("data-lesson-id")?.trim();
  const level = lessonElement.getAttribute("data-challenge-level")?.trim();
  const title =
    document
      .querySelector<HTMLElement>(".algorithm-title .challenge-title")
      ?.textContent?.replace(/\n/g, "")
      .trim() ?? "";
  const descriptionHtml =
    document.querySelector<HTMLElement>("div.guide-section-description > div.markdown")
      ?.innerHTML ?? "";
  const languageExtension =
    document
      .querySelector<HTMLElement>("div.editor > ul > li.nav-item > a")
      ?.innerText.split(".")
      .pop()
      ?.trim() ?? "txt";
  const language =
    document.querySelector<HTMLElement>("div#tour7 > button")?.textContent?.trim() ??
    languageExtension;
  const category = [...document.querySelectorAll<HTMLElement>("ol.breadcrumb li")]
    .filter((element) => !element.classList.contains("active"))
    .map((element) => element.innerText.trim())
    .filter(Boolean)
    .join(" > ");
  const code = getCodeFromEditor();
  const resultMessage = parseResultMessage();
  const { runtime, memory } = parseRuntimeAndMemory();

  if (!problemId || !level || !title || !code) {
    throw new Error("Could not parse required Programmers submission data.");
  }

  const lessonPathMatch = window.location.pathname.match(
    /\/learn\/courses\/\d+\/lessons\/\d+/
  );
  const lessonPath = lessonPathMatch?.[0];
  const canonicalLink =
    (lessonPath ? `${window.location.origin}${lessonPath}` : null) ??
    document
      .querySelector<HTMLLinkElement>('head > link[rel="canonical"]')
      ?.href.replace(/\?.*/g, "")
      .trim() ??
    document
      .querySelector<HTMLMetaElement>('head > meta[property="og:url"], head > meta[name$="url"]')
      ?.content.replace(/\?.*/g, "")
      .trim() ??
    `${window.location.origin}${window.location.pathname}`;

  return {
    problemId,
    title,
    level,
    category,
    descriptionHtml,
    language,
    languageExtension,
    code,
    resultMessage,
    runtime,
    memory,
    link: canonicalLink,
  };
}

function createProblemReadme(data: ProgrammersProblemData) {
  const submissionDate = getDateString(new Date());
  const levelLabel = formatProgrammersLevel(data.level);
  const category = data.category || "프로그래머스 코딩 테스트 연습";
  const summaryLines = data.resultMessage
    .split("<br/>")
    .map((line) => line.replace(/<[^>]+>/g, "").trim())
    .filter(Boolean);
  const summaryBlock =
    summaryLines.length > 0
      ? summaryLines.map((line) => `- ${line}`).join("\n")
      : "- 정답입니다.";

  return `# ${data.title}

> ${levelLabel} | ${data.problemId} | 프로그래머스

## Problem Overview

- Platform: 프로그래머스
- Level: ${levelLabel}
- Problem ID: ${data.problemId}
- Category: ${category}
- Problem Link: [${data.link}](${data.link})

## Problem

${data.descriptionHtml}

## Submission

| Item | Value |
| --- | --- |
| Status | Accepted |
| Language | ${escapePipe(data.language)} |
| Runtime | ${escapePipe(data.runtime)} |
| Memory | ${escapePipe(data.memory)} |
| Submitted At | ${submissionDate} |

### Result Summary

${summaryBlock}

---

_Synced with AlgorithmHub_`;
}

function buildUploadJob(data: ProgrammersProblemData, settings: ExtensionSettings) {
  const safeTitle = normalizePathSegment(data.title);
  const directory = buildRepositoryDirectory(settings.repositoryTemplate.programmers, {
    platform: getPlatformRootLabel("programmers"),
    level: data.level,
    id: data.problemId,
    title: safeTitle,
  });
  const commitMessage = `[프로그래머스][${formatProgrammersLevel(data.level)}] ${data.title} - Time: ${data.runtime}, Memory: ${data.memory} - AlgorithmHub`;

  let job: UploadJob = createUploadJob({
    id: `programmers:${data.problemId}:${data.language}`,
    platform: "programmers",
    problemId: data.problemId,
    title: data.title,
    directory,
    commitMessage,
    metadata: {
      level: data.level,
      language: data.language,
    },
  });

  job = addUploadFile(job, {
    path: `${safeTitle}.${data.languageExtension}`,
    content: data.code,
  });

  job = addUploadFile(job, {
    path: `archives/${createArchiveFileName(data.languageExtension)}`,
    content: data.code,
  });

  if (settings.platforms.programmers.createProblemReadme) {
    job = addUploadFile(job, {
      path: "README.md",
      content: createProblemReadme(data),
    });
  }

  return job;
}

async function waitForAcceptedResult(timeoutMs = 12000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (getAcceptedResultText().includes("정답")) {
      return true;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 500));
  }

  return false;
}

function createSubmissionHandler() {
  let lastUploadedKey = "";
  let lastTriggeredAt = 0;
  let lastPathname = window.location.pathname;
  let latestSyncContext: SyncedProblemContext | null = null;

  return async function handleSubmission() {
    try {
      if (window.location.pathname !== lastPathname) {
        lastPathname = window.location.pathname;
        lastUploadedKey = "";
        latestSyncContext = null;
        clearInlineStatus();
      }

      const settings = await getSettings();

      if (
        !settings.platforms.programmers.enabled ||
        !settings.platforms.programmers.autoUpload
      ) {
        return;
      }

      if (!(await isExtensionEnabled())) {
        return;
      }

      const now = Date.now();
      if (now - lastTriggeredAt < 1500) {
        return;
      }
      lastTriggeredAt = now;

      const accepted = await waitForAcceptedResult();
      if (!accepted) {
        clearInlineStatus();
        return;
      }

      if (!(await isExtensionEnabled())) {
        clearInlineStatus();
        return;
      }

      await prepareFooterStatusSlot();
      setInlineStatus("Syncing...", "working");
      const data = parseProgrammersProblemData();
      const uploadKey = `${data.problemId}:${data.language}:${data.code.length}`;
      if (uploadKey === lastUploadedKey) {
        setInlineStatus(
          "Synced",
          "success",
          latestSyncContext
            ? () => {
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
              }
            : undefined,
          "Open synced actions"
        );
        return;
      }

      latestSyncContext = null;
      const job = buildUploadJob(data, settings);
      const record = await Promise.all([uploadThroughBackground(job), wait(700)]).then(
        ([uploadRecord]) => uploadRecord
      );
      lastUploadedKey = uploadKey;
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
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest("button") as HTMLButtonElement | null;

      if (!isSubmitButtonElement(button)) {
        return;
      }

      void handleSubmission();
    },
    true
  );
}

export const programmersAdapter: PlatformAdapter = {
  platform: "programmers",
  canHandle(url) {
    return isProgrammersProblemPage(url);
  },
  async boot() {
    console.info("[AlgorithmHub] Programmers adapter booted.");
    await bindAutoUpload();
  },
};
