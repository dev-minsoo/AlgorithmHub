import type { Locale, ThemeMode } from "../core/types/domain";

type SyncedActionsModalOptions = {
  locale: Locale;
  themeMode: ThemeMode;
  title: string;
  onOpenRepository: () => void;
  onSaveNote: (note: string) => Promise<void>;
};

const MODAL_COPY = {
  en: {
    description: "Choose what to do with this solved problem.",
    openRepository: "Open repository",
    addNote: "Add note",
    noteTitle: "Add note",
    noteDescription: "Each non-empty line will be appended to NOTE.md as a bullet list.",
    notePlaceholder:
      "Hash map approach\nEstimated time complexity O(n)\nFaster than my previous attempt",
    back: "Back",
    save: "Save note",
    saving: "Saving...",
    emptyNote: "Write at least one line.",
    close: "Close",
    failed: "Failed to save the note.",
  },
  ko: {
    description: "이 문제에 대해 이어서 할 작업을 선택하세요.",
    openRepository: "저장소에서 보기",
    addNote: "노트 추가",
    noteTitle: "노트 추가",
    noteDescription: "입력한 각 줄은 NOTE.md에 불릿 포인트로 누적 저장됩니다.",
    notePlaceholder:
      "해시맵으로 풂\n시간복잡도는 O(n) 정도로 예상\n예전 풀이보다 조건 해석이 빨랐음",
    back: "뒤로",
    save: "노트 저장",
    saving: "저장 중...",
    emptyNote: "한 줄 이상 입력해 주세요.",
    close: "닫기",
    failed: "노트 저장에 실패했습니다.",
  },
} as const;

type EditorMessage =
  | { type: "ready" }
  | { type: "value"; requestId: string; value: string };

function resolveLocale(locale: Locale): Locale {
  if (locale === "ko" || locale === "en") {
    return locale;
  }

  const language =
    document.documentElement.lang || window.navigator.language || "";
  return language.toLowerCase().startsWith("ko") ? "ko" : "en";
}

function resolveTheme(themeMode: ThemeMode) {
  if (themeMode === "light") {
    return "light";
  }

  if (themeMode === "dark") {
    return "dark";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function createEditorDocument({
  isDark,
  placeholder,
}: {
  isDark: boolean;
  placeholder: string;
}) {
  const panelText = isDark ? "#e2e8f0" : "#0f172a";
  const border = isDark ? "#334155" : "#cbd5e1";
  const inputBackground = isDark ? "#020617" : "#ffffff";
  const placeholderColor = isDark ? "#64748b" : "#94a3b8";
  const focusRing = isDark
    ? "rgba(37, 99, 235, 0.28)"
    : "rgba(37, 99, 235, 0.18)";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        background: ${inputBackground};
        overflow: hidden;
      }
      textarea {
        display: block;
        width: 100%;
        height: 100%;
        border: 1px solid ${border};
        border-radius: 11px;
        background: ${inputBackground};
        color: ${panelText};
        caret-color: ${panelText};
        padding: 12px 14px;
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 14px;
        line-height: 1.6;
        resize: none;
        outline: none;
      }
      textarea::placeholder {
        color: ${placeholderColor};
        opacity: 1;
      }
      textarea:focus {
        border-color: #2563eb;
        box-shadow: 0 0 0 3px ${focusRing};
      }
    </style>
  </head>
  <body>
    <textarea rows="7" spellcheck="false"></textarea>
    <script>
      const textarea = document.querySelector("textarea");
      textarea.placeholder = ${JSON.stringify(placeholder)};
      const send = (message) => parent.postMessage({
        source: "algorithmhub-note-editor",
        ...message,
      }, "*");

      window.addEventListener("message", (event) => {
        if (event.data?.source !== "algorithmhub-note-editor-parent") return;
        if (event.data.type === "focus") {
          textarea.focus();
        }
        if (event.data.type === "requestValue") {
          send({
            type: "value",
            requestId: event.data.requestId,
            value: textarea.value,
          });
        }
        if (event.data.type === "setDisabled") {
          textarea.disabled = Boolean(event.data.disabled);
        }
      });

      window.addEventListener("focus", () => textarea.focus());
      textarea.addEventListener("keydown", (event) => event.stopPropagation());
      textarea.addEventListener("keyup", (event) => event.stopPropagation());
      textarea.addEventListener("click", () => textarea.focus());
      send({ type: "ready" });
      setTimeout(() => textarea.focus(), 0);
    </script>
  </body>
</html>`;
}

export function openSyncedActionsModal(options: SyncedActionsModalOptions) {
  const locale = resolveLocale(options.locale);
  const copy = MODAL_COPY[locale];
  const theme = resolveTheme(options.themeMode);
  const isDark = theme === "dark";

  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "2147483647";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.padding = "24px";
  overlay.style.background = isDark ? "rgba(15, 23, 42, 0.58)" : "rgba(15, 23, 42, 0.28)";

  const panel = document.createElement("div");
  panel.style.width = "min(100%, 460px)";
  panel.style.borderRadius = "16px";
  panel.style.border = isDark
    ? "1px solid rgba(148, 163, 184, 0.22)"
    : "1px solid rgba(148, 163, 184, 0.28)";
  panel.style.background = isDark ? "#0f172a" : "#ffffff";
  panel.style.boxShadow = isDark
    ? "0 24px 64px rgba(15, 23, 42, 0.36)"
    : "0 24px 64px rgba(15, 23, 42, 0.16)";
  panel.style.color = isDark ? "#e2e8f0" : "#0f172a";
  panel.style.padding = "20px";
  panel.style.fontFamily =
    "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  panel.style.position = "relative";

  const problemTitle = document.createElement("p");
  problemTitle.textContent = options.title;
  problemTitle.style.margin = "0";
  problemTitle.style.paddingRight = "32px";
  problemTitle.style.fontSize = "14px";
  problemTitle.style.fontWeight = "600";
  problemTitle.style.color = isDark ? "#f8fafc" : "#0f172a";

  const description = document.createElement("p");
  description.textContent = copy.description;
  description.style.margin = "8px 0 0";
  description.style.fontSize = "13px";
  description.style.lineHeight = "1.5";
  description.style.color = isDark ? "#94a3b8" : "#475569";

  const content = document.createElement("div");
  content.style.marginTop = "20px";

  const close = () => {
    window.removeEventListener("message", handleEditorMessage);
    document.removeEventListener("keydown", handleEscape, true);
    overlay.remove();
  };

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", copy.close);
  closeButton.textContent = "×";
  closeButton.style.position = "absolute";
  closeButton.style.top = "14px";
  closeButton.style.right = "14px";
  closeButton.style.width = "28px";
  closeButton.style.height = "28px";
  closeButton.style.border = "0";
  closeButton.style.borderRadius = "8px";
  closeButton.style.background = "transparent";
  closeButton.style.color = isDark ? "#94a3b8" : "#64748b";
  closeButton.style.fontSize = "22px";
  closeButton.style.lineHeight = "1";
  closeButton.style.cursor = "pointer";
  closeButton.onclick = close;

  const buttonClass = (button: HTMLButtonElement) => {
    button.type = "button";
    button.style.border = "1px solid transparent";
    button.style.borderRadius = "10px";
    button.style.padding = "11px 14px";
    button.style.fontSize = "14px";
    button.style.fontWeight = "600";
    button.style.cursor = "pointer";
    button.style.transition = "background-color 120ms ease, border-color 120ms ease";
  };

  let editorFrame: HTMLIFrameElement | null = null;
  let pendingValueRequest:
    | {
        requestId: string;
        resolve: (value: string) => void;
      }
    | null = null;

  const postEditorMessage = (message: object) => {
    editorFrame?.contentWindow?.postMessage(
      {
        source: "algorithmhub-note-editor-parent",
        ...message,
      },
      "*"
    );
  };

  const requestEditorValue = () =>
    new Promise<string>((resolve) => {
      const requestId = crypto.randomUUID();
      pendingValueRequest = { requestId, resolve };
      postEditorMessage({ type: "requestValue", requestId });
    });

  const handleEditorMessage = (
    event: MessageEvent<EditorMessage & { source?: string }>
  ) => {
    if (!editorFrame || event.source !== editorFrame.contentWindow) {
      return;
    }

    if (event.data?.source !== "algorithmhub-note-editor") {
      return;
    }

    if (event.data.type === "ready") {
      postEditorMessage({ type: "focus" });
      return;
    }

    if (
      event.data.type === "value" &&
      pendingValueRequest?.requestId === event.data.requestId
    ) {
      pendingValueRequest.resolve(event.data.value);
      pendingValueRequest = null;
    }
  };

  const renderActions = () => {
    editorFrame = null;
    pendingValueRequest = null;
    content.replaceChildren();

    const stack = document.createElement("div");
    stack.style.display = "grid";
    stack.style.gap = "10px";

    const openButton = document.createElement("button");
    buttonClass(openButton);
    openButton.textContent = copy.openRepository;
    openButton.style.width = "100%";
    openButton.style.background = "#2563eb";
    openButton.style.color = "#eff6ff";
    openButton.onclick = () => {
      options.onOpenRepository();
      close();
    };

    const noteButton = document.createElement("button");
    buttonClass(noteButton);
    noteButton.textContent = copy.addNote;
    noteButton.style.width = "100%";
    noteButton.style.background = isDark ? "#111827" : "#f8fafc";
    noteButton.style.borderColor = isDark ? "#334155" : "#cbd5e1";
    noteButton.style.color = isDark ? "#e2e8f0" : "#0f172a";
    noteButton.onclick = renderNoteEditor;

    stack.append(openButton, noteButton);
    content.appendChild(stack);
  };

  const renderNoteEditor = () => {
    content.replaceChildren();

    const heading = document.createElement("p");
    heading.textContent = copy.noteTitle;
    heading.style.margin = "0";
    heading.style.fontSize = "14px";
    heading.style.fontWeight = "600";
    heading.style.color = isDark ? "#f8fafc" : "#0f172a";

    const hint = document.createElement("p");
    hint.textContent = copy.noteDescription;
    hint.style.margin = "8px 0 0";
    hint.style.fontSize = "13px";
    hint.style.lineHeight = "1.5";
    hint.style.color = isDark ? "#94a3b8" : "#475569";

    editorFrame = document.createElement("iframe");
    editorFrame.title = copy.noteTitle;
    editorFrame.style.display = "block";
    editorFrame.style.width = "100%";
    editorFrame.style.height = "182px";
    editorFrame.style.marginTop = "14px";
    editorFrame.style.border = "0";
    editorFrame.style.borderRadius = "12px";
    editorFrame.style.background = isDark ? "#020617" : "#ffffff";
    editorFrame.style.colorScheme = isDark ? "dark" : "light";
    editorFrame.setAttribute("sandbox", "allow-scripts allow-same-origin");
    editorFrame.srcdoc = createEditorDocument({
      isDark,
      placeholder: copy.notePlaceholder,
    });

    const error = document.createElement("p");
    error.style.margin = "8px 0 0";
    error.style.fontSize = "12px";
    error.style.color = "#ef4444";
    error.style.minHeight = "18px";

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.justifyContent = "flex-end";
    actions.style.gap = "10px";
    actions.style.marginTop = "14px";

    const backButton = document.createElement("button");
    buttonClass(backButton);
    backButton.textContent = copy.back;
    backButton.style.width = "auto";
    backButton.style.background = "transparent";
    backButton.style.borderColor = isDark ? "#334155" : "#cbd5e1";
    backButton.style.color = isDark ? "#94a3b8" : "#475569";
    backButton.onclick = renderActions;

    const saveButton = document.createElement("button");
    buttonClass(saveButton);
    saveButton.textContent = copy.save;
    saveButton.style.width = "auto";
    saveButton.style.background = "#059669";
    saveButton.style.color = "#ecfdf5";
    saveButton.onclick = async () => {
      const note = (await requestEditorValue()).trim();
      if (!note) {
        error.textContent = copy.emptyNote;
        postEditorMessage({ type: "focus" });
        return;
      }

      error.textContent = "";
      postEditorMessage({ type: "setDisabled", disabled: true });
      backButton.disabled = true;
      saveButton.disabled = true;
      saveButton.textContent = copy.saving;

      try {
        await options.onSaveNote(note);
        close();
      } catch (reason) {
        error.textContent =
          reason instanceof Error ? reason.message : copy.failed;
        postEditorMessage({ type: "setDisabled", disabled: false });
        postEditorMessage({ type: "focus" });
        backButton.disabled = false;
        saveButton.disabled = false;
        saveButton.textContent = copy.save;
      }
    };

    actions.append(backButton, saveButton);
    content.append(heading, hint, editorFrame, error, actions);
  };

  const handleEscape = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      close();
    }
  };

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      close();
    }
  });

  window.addEventListener("message", handleEditorMessage);
  document.addEventListener("keydown", handleEscape, true);

  panel.append(closeButton, problemTitle, description, content);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  renderActions();
}
