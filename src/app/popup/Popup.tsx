import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type {
  ExtensionSettings,
  Locale,
  ThemeMode,
} from "../../core/types/domain";
import type { RuntimeMessageResponse } from "../../core/types/messages";
import { BrandWordmark } from "../../shared/components/BrandWordmark";
import { useResolvedTheme } from "../../shared/theme";

function openOptions(hash = "") {
  const url = chrome.runtime.getURL(`options.html${hash}`);
  void chrome.tabs.create({ url });
}

function openWelcome() {
  const url = chrome.runtime.getURL("welcome.html");
  void chrome.tabs.create({ url });
}

const ISSUE_URL = "https://github.com/dev-minsoo/AlgorithmHub/issues";
const REPOSITORY_URL = "https://github.com/dev-minsoo/AlgorithmHub";

const POPUP_COPY = {
  en: {
    subtitle: "Sync your code to GitHub",
    authTitle: "Authenticate with GitHub to use AlgorithmHub",
    authDescription:
      "Connect a GitHub account, then create a new repository or link an existing one.",
    gitAuthenticate: "Git Authenticate",
    connectTitle: "Connect a repository to start syncing",
    connectDescription:
      "Your GitHub account is authenticated. Create a new repository or link an existing one.",
    connectRepository: "Connect Repository",
    connected: "Connected repository",
    autoUpload: "Auto Upload",
    enabled: "Enabled",
    disabled: "Disabled",
    star: "Star Algorithm",
    report: "Report",
    openGitHub: "Open GitHub",
    openSettings: "Open settings",
    toggleTheme: "Toggle theme",
  },
  ko: {
    subtitle: "코드를 GitHub에 동기화하세요",
    authTitle: "AlgorithmHub를 사용하려면 GitHub 인증이 필요합니다",
    authDescription:
      "GitHub 계정을 연결한 뒤 새 저장소를 만들거나 기존 저장소를 연결하세요.",
    gitAuthenticate: "Git Authenticate",
    connectTitle: "동기화를 시작하려면 저장소를 연결하세요",
    connectDescription:
      "GitHub 인증은 완료되었습니다. 새 저장소를 만들거나 기존 저장소를 연결하세요.",
    connectRepository: "저장소 연결",
    connected: "연결된 저장소",
    autoUpload: "자동 업로드",
    enabled: "활성화",
    disabled: "비활성화",
    star: "Star Algorithm",
    report: "제보",
    openGitHub: "GitHub 열기",
    openSettings: "설정 열기",
    toggleTheme: "테마 전환",
  },
} as const;

async function openExternal(url: string) {
  await chrome.tabs.create({ url });
}

function IconButton({
  title,
  onClick,
  children,
  className = "",
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${className}`}
      title={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function GitWordmarkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.42-4.04-1.42-.55-1.38-1.33-1.75-1.33-1.75-1.08-.75.08-.74.08-.74 1.2.08 1.82 1.21 1.82 1.21 1.06 1.81 2.79 1.29 3.47.99.11-.75.42-1.29.76-1.59-2.67-.3-5.48-1.32-5.48-5.87 0-1.3.47-2.37 1.23-3.21-.12-.3-.53-1.52.12-3.17 0 0 1.01-.32 3.3 1.22a11.53 11.53 0 0 1 6.01 0c2.28-1.54 3.29-1.22 3.29-1.22.65 1.65.24 2.87.12 3.17.77.84 1.23 1.91 1.23 3.21 0 4.56-2.82 5.56-5.51 5.85.43.37.82 1.1.82 2.22v3.29c0 .32.22.69.83.58A12 12 0 0 0 12 .5Z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.42-4.04-1.42-.55-1.38-1.33-1.75-1.33-1.75-1.08-.75.08-.74.08-.74 1.2.08 1.82 1.21 1.82 1.21 1.06 1.81 2.79 1.29 3.47.99.11-.75.42-1.29.76-1.59-2.67-.3-5.48-1.32-5.48-5.87 0-1.3.47-2.37 1.23-3.21-.12-.3-.53-1.52.12-3.17 0 0 1.01-.32 3.3 1.22a11.53 11.53 0 0 1 6.01 0c2.28-1.54 3.29-1.22 3.29-1.22.65 1.65.24 2.87.12 3.17.77.84 1.23 1.91 1.23 3.21 0 4.56-2.82 5.56-5.51 5.85.43.37.82 1.1.82 2.22v3.29c0 .32.22.69.83.58A12 12 0 0 0 12 .5Z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-current" fill="none" aria-hidden="true">
      <path
        d="M10.33 3.39 9.94 5.1a6.9 6.9 0 0 0-1.55.9L6.77 5l-1.9 1.9 1 1.62a6.9 6.9 0 0 0-.9 1.55l-1.71.39v2.68l1.71.39c.2.55.5 1.07.9 1.55l-1 1.62 1.9 1.9 1.62-1a6.9 6.9 0 0 0 1.55.9l.39 1.71h2.68l.39-1.71c.55-.2 1.07-.5 1.55-.9l1.62 1 1.9-1.9-1-1.62c.4-.48.7-1 .9-1.55l1.71-.39v-2.68l-1.71-.39a6.9 6.9 0 0 0-.9-1.55l1-1.62L17.23 5l-1.62 1a6.9 6.9 0 0 0-1.55-.9l-.39-1.71h-2.34Z"
        strokeWidth="1.5"
      />
      <circle cx="12" cy="12" r="2.8" strokeWidth="1.5" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-current" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" strokeWidth="1.6" />
      <path
        d="M12 2.5v2.2M12 19.3v2.2M4.7 4.7l1.6 1.6M17.7 17.7l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.7 19.3l1.6-1.6M17.7 6.3l1.6-1.6"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M20.2 14.1A8.5 8.5 0 0 1 9.9 3.8a.6.6 0 0 0-.75-.75A9.5 9.5 0 1 0 20.95 14.9a.6.6 0 0 0-.75-.8Z" />
    </svg>
  );
}

export default function Popup() {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [extensionEnabled, setExtensionEnabled] = useState(true);

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

  const hasToken = Boolean(settings?.github.token.trim());
  const hasRepository = Boolean(settings?.github.repository.trim());
  const locale = settings?.locale ?? "en";
  const themeMode = settings?.themeMode ?? "system";
  const resolvedTheme = useResolvedTheme(themeMode);
  const copy = POPUP_COPY[locale];

  async function handleChangeTheme(nextThemeMode: ThemeMode) {
    const response = (await chrome.runtime.sendMessage({
      type: "SAVE_SETTINGS",
      settings: { themeMode: nextThemeMode },
    })) as RuntimeMessageResponse;

    if (response.type === "SETTINGS_SAVED") {
      setSettings(response.settings);
    }
  }

  async function handleToggleTheme() {
    const nextThemeMode =
      resolvedTheme === "dark" ? ("light" as ThemeMode) : ("dark" as ThemeMode);
    await handleChangeTheme(nextThemeMode);
  }

  async function handleToggleEnabled() {
    const nextValue = !extensionEnabled;
    setExtensionEnabled(nextValue);
    await chrome.storage.local.set({ extensionEnabled: nextValue });
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

  function handleAuthenticate() {
    openWelcome();
  }

  async function handleGitAuthenticate() {
    const response = (await chrome.runtime.sendMessage({
      type: "START_GITHUB_WEB_AUTH",
    })) as RuntimeMessageResponse;

    if (response.type !== "GITHUB_WEB_AUTH_START" || !response.ok) {
      openWelcome();
      return;
    }

    await chrome.tabs.create({ url: response.url });
  }

  async function handleOpenGitHub() {
    await openExternal("https://github.com/dev-minsoo/AlgorithmHub");
  }

  const shellClass =
    resolvedTheme === "dark"
      ? "bg-[radial-gradient(circle_at_20%_0%,_rgba(251,191,36,0.18),_transparent_34%),radial-gradient(circle_at_100%_100%,_rgba(245,158,11,0.14),_transparent_38%),linear-gradient(180deg,_#19110b,_#090909)] text-stone-100"
      : "bg-[radial-gradient(circle_at_20%_0%,_rgba(251,191,36,0.18),_transparent_32%),radial-gradient(circle_at_100%_100%,_rgba(245,158,11,0.10),_transparent_36%),linear-gradient(180deg,_#fdf6e8,_#fffdf8)] text-stone-900";
  const cardClass =
    resolvedTheme === "dark"
      ? "border-amber-950/60 bg-[linear-gradient(180deg,rgba(41,24,13,0.96),rgba(10,10,10,0.96))] shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
      : "border-amber-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(255,247,232,0.98))] shadow-[0_18px_48px_rgba(180,120,0,0.12)]";
  const panelClass =
    resolvedTheme === "dark"
      ? "border-stone-800 bg-stone-900/80"
      : "border-amber-300 bg-white";
  const mutedTextClass =
    resolvedTheme === "dark" ? "text-stone-400" : "text-stone-700";
  const secondaryTextClass =
    resolvedTheme === "dark" ? "text-stone-500" : "text-stone-600";
  const iconButtonClass =
    resolvedTheme === "dark"
      ? "border-stone-800 bg-stone-900 text-stone-200 hover:border-amber-400 hover:text-amber-300"
      : "border-amber-300 bg-white text-stone-800 hover:border-amber-500 hover:text-amber-800";

  return (
    <div className={`w-[420px] ${shellClass}`}>
      <div className="w-full p-3">
        <div className={`rounded-[22px] border p-4 backdrop-blur ${cardClass}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <BrandWordmark size="sm" />
              <p className={`mt-1.5 text-[13px] leading-5 ${mutedTextClass}`}>
                {copy.subtitle}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <IconButton
                title={copy.openGitHub}
                onClick={handleOpenGitHub}
                className={iconButtonClass}
              >
                <GitHubIcon />
              </IconButton>
              <IconButton
                title={copy.openSettings}
                onClick={() => openOptions()}
                className={iconButtonClass}
              >
                <SettingsIcon />
              </IconButton>
              <IconButton
                title={copy.toggleTheme}
                onClick={() => void handleToggleTheme()}
                className={iconButtonClass}
              >
                {resolvedTheme === "dark" ? <SunIcon /> : <MoonIcon />}
              </IconButton>
              <div
                className={`flex items-center rounded-full border p-1 text-[11px] font-semibold ${
                  resolvedTheme === "dark"
                    ? "border-stone-800 bg-stone-900 text-stone-300"
                    : "border-amber-300 bg-white text-stone-700"
                }`}
              >
                <button
                  className={`rounded-full px-2 py-1 transition ${
                    locale === "ko"
                      ? "bg-amber-400/15 text-amber-700"
                      : resolvedTheme === "dark"
                        ? "hover:text-stone-100"
                        : "hover:text-stone-900"
                  }`}
                  onClick={() => void handleChangeLocale("ko")}
                >
                  KO
                </button>
                <button
                  className={`rounded-full px-2 py-1 transition ${
                    locale === "en"
                      ? "bg-amber-400/15 text-amber-700"
                      : resolvedTheme === "dark"
                        ? "hover:text-stone-100"
                        : "hover:text-stone-900"
                  }`}
                  onClick={() => void handleChangeLocale("en")}
                >
                  EN
                </button>
              </div>
            </div>
          </div>

          {!hasToken ? (
            <section className={`mt-4 rounded-[18px] border p-4 ${panelClass}`}>
              <div className="space-y-2">
                <p
                  className={`whitespace-nowrap text-sm font-medium ${
                    resolvedTheme === "dark" ? "text-stone-200" : "text-stone-900"
                  }`}
                >
                  {copy.authTitle}
                </p>
                <p className={`text-[13px] leading-5 ${secondaryTextClass}`}>
                  {copy.authDescription}
                </p>
              </div>

              <button
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[14px] border border-stone-700 bg-stone-100 px-4 py-3 text-sm font-semibold text-stone-950 transition hover:bg-white"
                onClick={() => void handleGitAuthenticate()}
              >
                <GitWordmarkIcon />
                {copy.gitAuthenticate}
              </button>
            </section>
          ) : !hasRepository ? (
            <section className={`mt-4 rounded-[18px] border p-4 ${panelClass}`}>
              <div className="space-y-2">
                <p
                  className={`whitespace-nowrap text-sm font-medium ${
                    resolvedTheme === "dark" ? "text-stone-200" : "text-stone-900"
                  }`}
                >
                  {copy.connectTitle}
                </p>
                <p className={`text-[13px] leading-5 ${secondaryTextClass}`}>
                  {copy.connectDescription}
                </p>
              </div>

              <button
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[14px] border border-stone-700 bg-stone-100 px-4 py-3 text-sm font-semibold text-stone-950 transition hover:bg-white"
                onClick={handleAuthenticate}
              >
                <GitWordmarkIcon />
                {copy.connectRepository}
              </button>
            </section>
          ) : (
            <section
              className={`mt-4 rounded-[18px] border p-4 ${
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
              <p
                className={`mt-2 break-all text-[15px] font-medium ${
                  resolvedTheme === "dark" ? "text-stone-50" : "text-stone-900"
                }`}
              >
                {settings?.github.repository}
              </p>
            </section>
          )}

          {hasRepository ? (
            <div className={`mt-4 flex items-center justify-between rounded-[16px] border px-4 py-3 ${panelClass}`}>
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
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                    extensionEnabled ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>
          ) : null}

          <div className={`${hasRepository ? "mt-3" : "mt-4"} flex items-center justify-end gap-3`}>
            <a
              className={`text-xs font-medium transition hover:text-amber-300 ${mutedTextClass}`}
              href={REPOSITORY_URL}
              target="_blank"
              rel="noreferrer"
            >
              {copy.star}
            </a>
            <a
              className={`text-xs font-medium transition hover:text-amber-300 ${mutedTextClass}`}
              href={ISSUE_URL}
              target="_blank"
              rel="noreferrer"
            >
              {copy.report}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
