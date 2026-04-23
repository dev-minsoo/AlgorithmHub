import type { Locale } from "../core/types/domain";

type SyncedActionsModalOptions = {
  locale: Locale;
  title: string;
  onOpenRepository: () => void;
  onSaveNote: (note: string) => Promise<void>;
};

const MODAL_COPY = {
  en: {
    title: "Synced actions",
    description: "Choose what to do with this solved problem.",
    openRepository: "Open repository",
    addNote: "Add note",
    noteTitle: "Add note",
    noteDescription: "Each non-empty line will be appended to NOTE.md as a bullet list.",
    notePlaceholder:
      "Hash map approach\nEstimated time complexity O(n)\nFaster than my previous attempt",
    cancel: "Cancel",
    back: "Back",
    save: "Save note",
    saving: "Saving...",
    emptyNote: "Write at least one line.",
  },
  ko: {
    title: "동기화 액션",
    description: "이 문제에 대해 이어서 할 작업을 선택하세요.",
    openRepository: "저장소에서 보기",
    addNote: "메모 추가",
    noteTitle: "메모 추가",
    noteDescription: "입력한 각 줄은 NOTE.md에 불렛 포인트로 누적 저장됩니다.",
    notePlaceholder:
      "해시맵으로 풂\n시간복잡도는 O(n) 정도로 예상\n예전 풀이보다 조건 해석이 빨랐음",
    cancel: "취소",
    back: "뒤로",
    save: "메모 저장",
    saving: "저장 중...",
    emptyNote: "한 줄 이상 입력해 주세요.",
  },
} as const;

export function openSyncedActionsModal(options: SyncedActionsModalOptions) {
  const copy = MODAL_COPY[options.locale];
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "2147483647";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.padding = "24px";
  overlay.style.background = "rgba(15, 23, 42, 0.56)";

  const panel = document.createElement("div");
  panel.style.width = "min(100%, 460px)";
  panel.style.borderRadius = "16px";
  panel.style.border = "1px solid rgba(148, 163, 184, 0.28)";
  panel.style.background = "#0f172a";
  panel.style.boxShadow = "0 24px 64px rgba(15, 23, 42, 0.36)";
  panel.style.color = "#e2e8f0";
  panel.style.padding = "20px";
  panel.style.fontFamily =
    "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  const title = document.createElement("h2");
  title.textContent = copy.title;
  title.style.margin = "0";
  title.style.fontSize = "18px";
  title.style.fontWeight = "700";

  const problemTitle = document.createElement("p");
  problemTitle.textContent = options.title;
  problemTitle.style.margin = "8px 0 0";
  problemTitle.style.fontSize = "14px";
  problemTitle.style.fontWeight = "600";
  problemTitle.style.color = "#f8fafc";

  const description = document.createElement("p");
  description.textContent = copy.description;
  description.style.margin = "8px 0 0";
  description.style.fontSize = "13px";
  description.style.lineHeight = "1.5";
  description.style.color = "#94a3b8";

  const content = document.createElement("div");
  content.style.marginTop = "20px";

  const close = () => {
    document.removeEventListener("keydown", handleKeyDown);
    overlay.remove();
  };

  const buttonClass = (button: HTMLButtonElement) => {
    button.type = "button";
    button.style.width = "100%";
    button.style.border = "1px solid transparent";
    button.style.borderRadius = "10px";
    button.style.padding = "11px 14px";
    button.style.fontSize = "14px";
    button.style.fontWeight = "600";
    button.style.cursor = "pointer";
    button.style.transition = "background-color 120ms ease, border-color 120ms ease";
  };

  const renderActions = () => {
    content.replaceChildren();

    const stack = document.createElement("div");
    stack.style.display = "grid";
    stack.style.gap = "10px";

    const openButton = document.createElement("button");
    buttonClass(openButton);
    openButton.textContent = copy.openRepository;
    openButton.style.background = "#2563eb";
    openButton.style.color = "#eff6ff";
    openButton.onclick = () => {
      options.onOpenRepository();
      close();
    };

    const noteButton = document.createElement("button");
    buttonClass(noteButton);
    noteButton.textContent = copy.addNote;
    noteButton.style.background = "#111827";
    noteButton.style.borderColor = "#334155";
    noteButton.style.color = "#e2e8f0";
    noteButton.onclick = renderNoteEditor;

    const cancelButton = document.createElement("button");
    buttonClass(cancelButton);
    cancelButton.textContent = copy.cancel;
    cancelButton.style.background = "transparent";
    cancelButton.style.borderColor = "#334155";
    cancelButton.style.color = "#94a3b8";
    cancelButton.onclick = close;

    stack.append(openButton, noteButton, cancelButton);
    content.appendChild(stack);
  };

  const renderNoteEditor = () => {
    content.replaceChildren();

    const heading = document.createElement("p");
    heading.textContent = copy.noteTitle;
    heading.style.margin = "0";
    heading.style.fontSize = "14px";
    heading.style.fontWeight = "600";
    heading.style.color = "#f8fafc";

    const hint = document.createElement("p");
    hint.textContent = copy.noteDescription;
    hint.style.margin = "8px 0 0";
    hint.style.fontSize = "13px";
    hint.style.lineHeight = "1.5";
    hint.style.color = "#94a3b8";

    const textarea = document.createElement("textarea");
    textarea.placeholder = copy.notePlaceholder;
    textarea.rows = 7;
    textarea.style.width = "100%";
    textarea.style.marginTop = "14px";
    textarea.style.border = "1px solid #334155";
    textarea.style.borderRadius = "12px";
    textarea.style.background = "#020617";
    textarea.style.color = "#e2e8f0";
    textarea.style.padding = "12px 14px";
    textarea.style.fontSize = "14px";
    textarea.style.lineHeight = "1.6";
    textarea.style.resize = "vertical";

    const error = document.createElement("p");
    error.style.margin = "8px 0 0";
    error.style.fontSize = "12px";
    error.style.color = "#fca5a5";
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
    backButton.style.borderColor = "#334155";
    backButton.style.color = "#94a3b8";
    backButton.onclick = renderActions;

    const saveButton = document.createElement("button");
    buttonClass(saveButton);
    saveButton.textContent = copy.save;
    saveButton.style.width = "auto";
    saveButton.style.background = "#059669";
    saveButton.style.color = "#ecfdf5";
    saveButton.onclick = async () => {
      const note = textarea.value.trim();
      if (!note) {
        error.textContent = copy.emptyNote;
        textarea.focus();
        return;
      }

      error.textContent = "";
      textarea.disabled = true;
      backButton.disabled = true;
      saveButton.disabled = true;
      saveButton.textContent = copy.saving;

      try {
        await options.onSaveNote(note);
        close();
      } catch (reason) {
        error.textContent =
          reason instanceof Error ? reason.message : "Failed to save the note.";
        textarea.disabled = false;
        backButton.disabled = false;
        saveButton.disabled = false;
        saveButton.textContent = copy.save;
      }
    };

    actions.append(backButton, saveButton);
    content.append(heading, hint, textarea, error, actions);
    window.setTimeout(() => textarea.focus(), 0);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      close();
    }
  };

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      close();
    }
  });

  document.addEventListener("keydown", handleKeyDown);

  panel.append(title, problemTitle, description, content);
  overlay.appendChild(panel);
  renderActions();
  document.body.appendChild(overlay);
}
