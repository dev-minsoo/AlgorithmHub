import { useEffect, useState } from "react";
import {
  buildRepositoryDirectory,
  getPlatformRootLabel,
  TEMPLATE_SEGMENT_LABELS,
} from "../../core/path/template";
import { DEFAULT_SETTINGS } from "../../core/storage/settings";
import { PLATFORM_DEFINITIONS, PLATFORM_IDS } from "../../core/platforms";
import type {
  ExtensionSettings,
  Locale,
  PlatformId,
  RepositoryTemplateSegment,
  ThemeMode,
} from "../../core/types/domain";
import type { RuntimeMessageResponse } from "../../core/types/messages";
import { BrandWordmark } from "../../shared/components/BrandWordmark";
import { useResolvedTheme } from "../../shared/theme";

const ISSUE_URL = "https://github.com/dev-minsoo/AlgorithmHub/issues";
const REPOSITORY_URL = "https://github.com/dev-minsoo/AlgorithmHub";

const TEMPLATE_SEGMENTS: RepositoryTemplateSegment[] = [
  "platform",
  "level",
  "id",
  "title",
];

const OPTIONS_COPY = {
  en: {
    eyebrow: "Repository settings",
    description: "Manage the repository currently connected to AlgorithmHub.",
    connected: "Connected repository",
    noRepository: "No repository connected",
    connectHint: "Connect a repository from the welcome flow first.",
    solving: "Start solving problems right away:",
    theme: "Theme",
    themeSystem: "System",
    themeLight: "Light",
    themeDark: "Dark",
    language: "Language",
    autoUpload: "Auto Upload",
    enabled: "Enabled",
    disabled: "Disabled",
    templatesEyebrow: "Repository path templates",
    templatesTitle: "Configure each platform separately",
    templatesDescription:
      "Each platform can use a different path template. When ID is placed directly before Title, AlgorithmHub can combine them into the default format: ID. Title.",
    templateLabel: "template",
    templateHint:
      "Drag enabled segments to reorder them. Use the toggle to include or exclude each segment without changing its row position.",
    combine: "Combine ID + Title",
    disconnect: "Disconnect Repository",
    star: "Star AlgorithmHub on GitHub",
    report: "Report a bug or request a feature",
  },
  ko: {
    eyebrow: "저장소 설정",
    description: "현재 AlgorithmHub에 연결된 저장소를 관리합니다.",
    connected: "연결된 저장소",
    noRepository: "연결된 저장소가 없습니다",
    connectHint: "먼저 welcome 화면에서 저장소를 연결하세요.",
    solving: "바로 문제를 풀어보세요:",
    theme: "테마",
    themeSystem: "System",
    themeLight: "Light",
    themeDark: "Dark",
    language: "언어",
    autoUpload: "자동 업로드",
    enabled: "활성화",
    disabled: "비활성화",
    templatesEyebrow: "저장 경로 템플릿",
    templatesTitle: "플랫폼별로 따로 설정하세요",
    templatesDescription:
      "각 플랫폼은 서로 다른 경로 템플릿을 사용할 수 있습니다. ID가 Title 바로 앞에 오면 기본 형식인 ID. Title로 합칠 수 있습니다.",
    templateLabel: "템플릿",
    templateHint:
      "활성화된 세그먼트를 드래그해서 순서를 바꾸고, 토글로 포함 여부를 제어하세요.",
    combine: "ID + Title 합치기",
    disconnect: "저장소 연결 해제",
    star: "AlgorithmHub GitHub에 Star 남기기",
    report: "버그 또는 기능 요청 제보하기",
  },
} as const;

type OptionsCopy = Record<keyof (typeof OPTIONS_COPY)["en"], string>;

function openWelcome() {
  const url = chrome.runtime.getURL("welcome.html");
  void chrome.tabs.create({ url });
}

function PathTemplateCard({
  platform,
  settings,
  draggedSegment,
  setDraggedSegment,
  onUpdateOrder,
  onToggleSegment,
  onToggleCombine,
  copy,
  resolvedTheme,
}: {
  platform: PlatformId;
  settings: ExtensionSettings;
  draggedSegment: RepositoryTemplateSegment | null;
  setDraggedSegment: (segment: RepositoryTemplateSegment | null) => void;
  onUpdateOrder: (
    platform: PlatformId,
    order: RepositoryTemplateSegment[]
  ) => Promise<void>;
  onToggleSegment: (
    platform: PlatformId,
    segment: RepositoryTemplateSegment
  ) => Promise<void>;
  onToggleCombine: (platform: PlatformId) => Promise<void>;
  copy: OptionsCopy;
  resolvedTheme: "light" | "dark";
}) {
  const template = settings.repositoryTemplate[platform];
  const definition = PLATFORM_DEFINITIONS[platform];
  const previewPath = buildRepositoryDirectory(template, {
    platform: getPlatformRootLabel(platform),
    level: definition.pathPreview.level,
    id: definition.pathPreview.id,
    title: definition.pathPreview.title,
  });
  const fileName = definition.pathPreview.fileName;

  return (
    <div
      className={`rounded-[20px] border p-5 ${
        resolvedTheme === "dark"
          ? "border-stone-800 bg-stone-900/60"
          : "border-amber-300 bg-white"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
        {definition.displayName} {copy.templateLabel}
      </p>
      <p
        className={`mt-2 text-sm leading-6 ${
          resolvedTheme === "dark" ? "text-stone-400" : "text-stone-700"
        }`}
      >
        {copy.templateHint}
      </p>

      <div
        className={`mt-4 rounded-[14px] border px-4 py-3 ${
          resolvedTheme === "dark"
            ? "border-stone-800 bg-stone-950/70"
            : "border-amber-300 bg-amber-50"
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p
              className={`text-sm font-semibold ${
                resolvedTheme === "dark" ? "text-stone-100" : "text-stone-900"
              }`}
            >
              {copy.combine}
            </p>
          </div>
          <button
            className={`relative h-7 w-12 rounded-full transition ${
              template.combineIdTitle ? "bg-emerald-500" : "bg-stone-700"
            }`}
            aria-pressed={template.combineIdTitle}
            onClick={() => void onToggleCombine(platform)}
            type="button"
          >
            <span
              className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform ${
                template.combineIdTitle ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {template.order.map((segment) => {
          const active = template.enabled[segment];
          const enabledCount = TEMPLATE_SEGMENTS.filter(
            (current) => template.enabled[current]
          ).length;
          const disabled = active && enabledCount === 1;

          return (
            <div
              key={`${platform}:${segment}`}
              className={`flex items-center justify-between rounded-[14px] border px-4 py-3 transition ${
                active
                  ? resolvedTheme === "dark"
                    ? "border-stone-700 bg-stone-950/80"
                    : "border-amber-300 bg-white"
                  : resolvedTheme === "dark"
                    ? "border-stone-800 bg-stone-950/40"
                    : "border-amber-200 bg-amber-50/70"
              }`}
              draggable={active}
              onDragStart={() => {
                if (active) {
                  setDraggedSegment(segment);
                }
              }}
              onDragEnd={() => setDraggedSegment(null)}
              onDragOver={(event) => {
                if (!active || !draggedSegment || draggedSegment === segment) {
                  return;
                }

                event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (!active || !draggedSegment || draggedSegment === segment) {
                  return;
                }

                const nextOrder = [...template.order];
                const sourceIndex = nextOrder.indexOf(draggedSegment);
                const targetIndex = nextOrder.indexOf(segment);

                if (sourceIndex === -1 || targetIndex === -1) {
                  return;
                }

                const [moved] = nextOrder.splice(sourceIndex, 1);
                nextOrder.splice(targetIndex, 0, moved);
                void onUpdateOrder(platform, nextOrder);
                setDraggedSegment(null);
              }}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`text-base ${
                    active
                      ? resolvedTheme === "dark"
                        ? "cursor-grab text-stone-500"
                        : "cursor-grab text-stone-400"
                      : resolvedTheme === "dark"
                        ? "text-stone-700"
                        : "text-stone-300"
                  }`}
                  aria-hidden="true"
                >
                  ≡
                </span>
                <span
                  className={`text-sm font-semibold ${
                    resolvedTheme === "dark" ? "text-stone-100" : "text-stone-900"
                  }`}
                >
                  {TEMPLATE_SEGMENT_LABELS[segment]}
                </span>
              </div>

              <button
                className={`relative h-7 w-12 rounded-full transition ${
                  active ? "bg-emerald-500" : "bg-stone-700"
                }`}
                aria-pressed={active}
                disabled={disabled}
                onClick={() => void onToggleSegment(platform, segment)}
                type="button"
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                    active ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>

      <div
        className={`mt-4 rounded-[14px] border px-4 py-3 text-sm leading-6 ${
          resolvedTheme === "dark"
            ? "border-stone-800 bg-stone-950/80 text-stone-200"
            : "border-amber-300 bg-amber-50 text-stone-900"
        }`}
      >
        {previewPath}/{fileName}
      </div>
    </div>
  );
}

export default function Options() {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [draggedSegment, setDraggedSegment] =
    useState<RepositoryTemplateSegment | null>(null);
  const [extensionEnabled, setExtensionEnabled] = useState(true);
  const [templatesOpen, setTemplatesOpen] = useState(true);

  useEffect(() => {
    void chrome.runtime
      .sendMessage({ type: "GET_SETTINGS" })
      .then((response: RuntimeMessageResponse) => {
        if (response.type === "SETTINGS_STATE") {
          setSettings(response.settings);
        }
      });

    void chrome.storage.local.get(["extensionEnabled"]).then((stored) => {
      if (typeof stored.extensionEnabled === "boolean") {
        setExtensionEnabled(stored.extensionEnabled);
      }
    });

    const handleStorageChange: Parameters<
      typeof chrome.storage.onChanged.addListener
    >[0] = (changes, areaName) => {
      if (areaName !== "local") {
        return;
      }

      if (changes.settings?.newValue) {
        setSettings(changes.settings.newValue as ExtensionSettings);
      }

      if (typeof changes.extensionEnabled?.newValue === "boolean") {
        setExtensionEnabled(changes.extensionEnabled.newValue);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  async function disconnectRepository() {
    const response = (await chrome.runtime.sendMessage({
      type: "DISCONNECT_GITHUB_REPOSITORY",
    })) as RuntimeMessageResponse;

    if (response.type === "SETTINGS_SAVED") {
      setSettings(response.settings);
      openWelcome();
      window.close();
    }
  }

  async function updateTemplateOrder(
    platform: PlatformId,
    order: RepositoryTemplateSegment[]
  ) {
    const response = (await chrome.runtime.sendMessage({
      type: "SAVE_SETTINGS",
      settings: {
        repositoryTemplate: {
          [platform]: {
            order,
          },
        },
      },
    })) as RuntimeMessageResponse;

    if (response.type === "SETTINGS_SAVED") {
      setSettings(response.settings);
    }
  }

  async function toggleTemplateSegment(
    platform: PlatformId,
    segment: RepositoryTemplateSegment
  ) {
    const currentTemplate = settings.repositoryTemplate[platform];
    const enabledCount = TEMPLATE_SEGMENTS.filter(
      (current) => currentTemplate.enabled[current]
    ).length;

    if (currentTemplate.enabled[segment] && enabledCount === 1) {
      return;
    }

    const response = (await chrome.runtime.sendMessage({
      type: "SAVE_SETTINGS",
      settings: {
        repositoryTemplate: {
          [platform]: {
            enabled: {
              [segment]: !currentTemplate.enabled[segment],
            },
          },
        },
      },
    })) as RuntimeMessageResponse;

    if (response.type === "SETTINGS_SAVED") {
      setSettings(response.settings);
    }
  }

  async function toggleCombineIdTitle(platform: PlatformId) {
    const currentTemplate = settings.repositoryTemplate[platform];
    const response = (await chrome.runtime.sendMessage({
      type: "SAVE_SETTINGS",
      settings: {
        repositoryTemplate: {
          [platform]: {
            combineIdTitle: !currentTemplate.combineIdTitle,
          },
        },
      },
    })) as RuntimeMessageResponse;

    if (response.type === "SETTINGS_SAVED") {
      setSettings(response.settings);
    }
  }

  async function handleChangeLocale(locale: Locale) {
    const response = (await chrome.runtime.sendMessage({
      type: "SAVE_SETTINGS",
      settings: { locale },
    })) as RuntimeMessageResponse;

    if (response.type === "SETTINGS_SAVED") {
      setSettings(response.settings);
    }
  }

  async function handleToggleEnabled() {
    const nextValue = !extensionEnabled;
    setExtensionEnabled(nextValue);
    await chrome.storage.local.set({ extensionEnabled: nextValue });
  }

  const isConnected = Boolean(settings.github.repository.trim());
  const copy = OPTIONS_COPY[settings.locale];
  const resolvedTheme = useResolvedTheme(settings.themeMode);

  async function handleChangeTheme(themeMode: ThemeMode) {
    const response = (await chrome.runtime.sendMessage({
      type: "SAVE_SETTINGS",
      settings: { themeMode },
    })) as RuntimeMessageResponse;

    if (response.type === "SETTINGS_SAVED") {
      setSettings(response.settings);
    }
  }

  const pageClass =
    resolvedTheme === "dark"
      ? "min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.16),_transparent_30%),linear-gradient(180deg,_#140f0c,_#060606)] text-stone-100"
      : "min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.16),_transparent_30%),linear-gradient(180deg,_#fcf5e8,_#fffdf8)] text-stone-900";
  const shellClass =
    resolvedTheme === "dark"
      ? "border-amber-950/60 bg-[linear-gradient(180deg,rgba(41,24,13,0.92),rgba(12,12,12,0.94))] shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
      : "border-amber-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(255,247,232,0.98))] shadow-[0_24px_64px_rgba(180,120,0,0.10)]";
  const cardClass =
    resolvedTheme === "dark"
      ? "border-stone-800 bg-stone-950/60"
      : "border-amber-300 bg-white";
  const rowClass =
    resolvedTheme === "dark"
      ? "border-stone-800 bg-stone-900/70"
      : "border-amber-300 bg-amber-50/85";

  return (
    <div className={pageClass}>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-400">
            {copy.eyebrow}
          </p>
          <div className="mt-3">
            <BrandWordmark size="lg" />
          </div>
          <p
            className={`mt-2 text-sm leading-6 ${
              resolvedTheme === "dark" ? "text-stone-400" : "text-stone-700"
            }`}
          >
            {copy.description}
          </p>
        </header>

        <section className={`rounded-[28px] border p-5 sm:p-6 ${shellClass}`}>
          <div
            className={`rounded-[22px] border p-6 ${
              resolvedTheme === "dark"
                ? "border-emerald-900/50 bg-emerald-950/30"
                : "border-emerald-300 bg-emerald-50"
            }`}
          >
            <p
              className={`text-xs font-semibold uppercase tracking-[0.24em] ${
                resolvedTheme === "dark" ? "text-emerald-400" : "text-emerald-700"
              }`}
            >
              {copy.connected}
            </p>
            {isConnected ? (
              <p
                className={`mt-3 break-all text-lg font-medium ${
                  resolvedTheme === "dark" ? "text-stone-50" : "text-stone-900"
                }`}
              >
                <a
                  className={`underline underline-offset-4 transition ${
                    resolvedTheme === "dark"
                      ? "decoration-emerald-700 hover:text-emerald-200"
                      : "decoration-emerald-500 hover:text-emerald-800"
                  }`}
                  href={`https://github.com/${settings.github.repository}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {settings.github.repository}
                </a>
              </p>
            ) : (
              <p
                className={`mt-3 break-all text-lg font-medium ${
                  resolvedTheme === "dark" ? "text-stone-50" : "text-stone-900"
                }`}
              >
                {copy.noRepository}
              </p>
            )}
            {!isConnected ? (
              <p
                className={`mt-1 text-sm ${
                  resolvedTheme === "dark" ? "text-stone-500" : "text-stone-600"
                }`}
              >
                {copy.connectHint}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
              <p
                className={`text-sm ${
                  resolvedTheme === "dark" ? "text-stone-300" : "text-stone-700"
                }`}
              >
                {copy.solving}
              </p>
              {PLATFORM_IDS.map((platform) => {
                const definition = PLATFORM_DEFINITIONS[platform];

                return (
                  <a
                    key={platform}
                    className={`font-medium transition ${
                      resolvedTheme === "dark"
                        ? "text-cyan-300 hover:text-cyan-200"
                        : "text-cyan-700 hover:text-cyan-800"
                    }`}
                    href={definition.solveUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {definition.displayName}
                  </a>
                );
              })}
            </div>
          </div>

          <div className={`mt-5 rounded-[22px] border p-5 ${cardClass}`}>
            <div className="space-y-4">
              <div className={`flex min-h-[60px] items-center justify-between gap-4 rounded-[16px] border px-4 py-4 ${rowClass}`}>
                <p
                  className={`text-sm font-medium ${
                    resolvedTheme === "dark" ? "text-stone-100" : "text-stone-900"
                  }`}
                >
                  {copy.autoUpload} {extensionEnabled ? copy.enabled : copy.disabled}
                </p>
                <button
                  className={`relative h-7 w-12 rounded-full transition ${
                    extensionEnabled ? "bg-emerald-500" : "bg-stone-700"
                  }`}
                  aria-pressed={extensionEnabled}
                  onClick={() => void handleToggleEnabled()}
                  type="button"
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                      extensionEnabled ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              </div>

              <div className={`flex min-h-[60px] items-center justify-between gap-4 rounded-[16px] border px-4 py-4 ${rowClass}`}>
                <span
                  className={`text-sm font-medium ${
                    resolvedTheme === "dark" ? "text-stone-100" : "text-stone-900"
                  }`}
                >
                  {copy.theme}
                </span>
                <select
                  className={`h-[44px] w-[132px] rounded-[14px] border px-3 text-sm outline-none transition ${
                    resolvedTheme === "dark"
                      ? "border-stone-800 bg-stone-950/80 text-stone-100 focus:border-amber-400"
                      : "border-amber-300 bg-white text-stone-900 focus:border-amber-600"
                  }`}
                  value={settings.themeMode}
                  onChange={(event) =>
                    void handleChangeTheme(event.target.value as ThemeMode)
                  }
                >
                  <option value="system">{copy.themeSystem}</option>
                  <option value="light">{copy.themeLight}</option>
                  <option value="dark">{copy.themeDark}</option>
                </select>
              </div>

              <div className={`flex min-h-[60px] items-center justify-between gap-4 rounded-[16px] border px-4 py-4 ${rowClass}`}>
                <span
                  className={`text-sm font-medium ${
                    resolvedTheme === "dark" ? "text-stone-100" : "text-stone-900"
                  }`}
                >
                  {copy.language}
                </span>
                <select
                  className={`h-[44px] w-[132px] rounded-[14px] border px-3 text-sm outline-none transition ${
                    resolvedTheme === "dark"
                      ? "border-stone-800 bg-stone-950/80 text-stone-100 focus:border-amber-400"
                      : "border-amber-300 bg-white text-stone-900 focus:border-amber-600"
                  }`}
                  value={settings.locale}
                  onChange={(event) =>
                    void handleChangeLocale(event.target.value as Locale)
                  }
                >
                  <option value="ko">한국어</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          </div>

          <div className={`mt-5 rounded-[22px] border p-5 ${cardClass}`}>
            <button
              className="flex w-full items-start justify-between gap-4 text-left"
              onClick={() => setTemplatesOpen((current) => !current)}
              type="button"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-400">
                  {copy.templatesEyebrow}
                </p>
                <p
                  className={`mt-2 text-lg font-medium ${
                    resolvedTheme === "dark" ? "text-stone-50" : "text-stone-900"
                  }`}
                >
                  {copy.templatesTitle}
                </p>
                <p
                  className={`mt-2 max-w-4xl text-sm leading-6 ${
                    resolvedTheme === "dark" ? "text-stone-400" : "text-stone-700"
                  }`}
                >
                  {copy.templatesDescription}
                </p>
              </div>
              <span
                className={`mt-1 inline-flex text-stone-400 transition ${
                  templatesOpen ? "rotate-180" : "rotate-0"
                }`}
                aria-hidden="true"
              >
                <svg viewBox="0 0 20 20" className="h-5 w-5 fill-current">
                  <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.1 1.02l-4.25 4.5a.75.75 0 0 1-1.1 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" />
                </svg>
              </span>
            </button>

            {templatesOpen ? (
              <div className="mt-5 grid gap-4 xl:grid-cols-3">
                {PLATFORM_IDS.map((platform) => (
                  <PathTemplateCard
                    key={platform}
                    platform={platform}
                    settings={settings}
                    draggedSegment={draggedSegment}
                    setDraggedSegment={setDraggedSegment}
                    onUpdateOrder={updateTemplateOrder}
                    onToggleSegment={toggleTemplateSegment}
                    onToggleCombine={toggleCombineIdTitle}
                    copy={copy}
                    resolvedTheme={resolvedTheme}
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              className={`rounded-[16px] border px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                resolvedTheme === "dark"
                  ? "border-red-900/70 bg-red-950/30 text-red-100 hover:border-red-700"
                  : "border-red-300 bg-red-50 text-red-700 hover:border-red-400 hover:bg-red-100 hover:text-red-800"
              }`}
              onClick={() => void disconnectRepository()}
              disabled={!isConnected}
            >
              {copy.disconnect}
            </button>
            <div className="flex items-center gap-4">
              <a
                className={`text-sm font-medium transition ${
                  resolvedTheme === "dark"
                    ? "text-cyan-300 hover:text-cyan-200"
                    : "text-cyan-700 hover:text-cyan-800"
                }`}
                href={REPOSITORY_URL}
                target="_blank"
                rel="noreferrer"
              >
                {copy.star}
              </a>
              <a
                className={`text-sm font-medium transition ${
                  resolvedTheme === "dark"
                    ? "text-stone-400 hover:text-amber-300"
                    : "text-stone-600 hover:text-amber-700"
                }`}
                href={ISSUE_URL}
                target="_blank"
                rel="noreferrer"
              >
                {copy.report}
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
