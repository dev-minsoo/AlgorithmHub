import { useCallback, useEffect, useState } from "react";
import { consumeWelcomeMode } from "../../core/storage/auth";
import { getCachedGitHubRepositories } from "../../core/storage/repositories";
import type { ExtensionSettings, RepositoryInfo } from "../../core/types/domain";
import type { RuntimeMessageResponse } from "../../core/types/messages";
import { BrandWordmark } from "../../shared/components/BrandWordmark";
import { useResolvedTheme } from "../../shared/theme";

type RepoMode = "" | "new" | "link";

const emptySettings: ExtensionSettings = {
  locale: "en",
  themeMode: "system",
  github: {
    oauthClientId: "",
    token: "",
    username: "",
    repository: "",
    branch: "",
  },
  platforms: {
    leetcode: {
      enabled: true,
      autoUpload: true,
      createProblemReadme: true,
      attachNotes: false,
    },
    programmers: {
      enabled: true,
      autoUpload: true,
      createProblemReadme: true,
      attachNotes: false,
    },
  },
  repositoryTemplate: {
    leetcode: {
      order: ["platform", "level", "id", "title"],
      enabled: {
        platform: true,
        level: true,
        id: true,
        title: true,
      },
      combineIdTitle: true,
    },
    programmers: {
      order: ["platform", "level", "id", "title"],
      enabled: {
        platform: true,
        level: true,
        id: true,
        title: true,
      },
      combineIdTitle: true,
    },
  },
};

function openOptions() {
  const url = chrome.runtime.getURL("options.html");
  void chrome.tabs.create({ url });
}

export default function Welcome() {
  const [settings, setSettings] = useState<ExtensionSettings>(emptySettings);
  const [mode, setMode] = useState<RepoMode>("");
  const [repositoryName, setRepositoryName] = useState("");
  const [availableRepositories, setAvailableRepositories] = useState<RepositoryInfo[]>([]);
  const [selectedRepository, setSelectedRepository] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const resolvedTheme = useResolvedTheme(settings.themeMode);

  const loadRepositories = useCallback(async (token = settings.github.token) => {
    if (!token.trim()) {
      return;
    }

    const cachedRepositories = await getCachedGitHubRepositories();
    if (cachedRepositories.length > 0) {
      setAvailableRepositories(cachedRepositories);
      setSelectedRepository((current) => current || cachedRepositories[0].fullName);
    }

    const response = (await chrome.runtime.sendMessage({
      type: "LIST_GITHUB_REPOSITORIES",
    })) as RuntimeMessageResponse;

    if (response.type !== "GITHUB_REPOSITORIES") {
      return;
    }

    if (!response.ok) {
      setMessage(response.reason);
      return;
    }

    setAvailableRepositories(response.repositories);
    setMessage(
      response.repositories.length > 0
        ? ""
        : "No available repositories were found on your GitHub account."
    );

    if (response.repositories.length > 0) {
      setSelectedRepository((current) =>
        current && response.repositories.some((repository) => repository.fullName === current)
          ? current
          : response.repositories[0].fullName
      );
    }
  }, [settings.github.token]);

  useEffect(() => {
    void (async () => {
      const initialMode = await consumeWelcomeMode();
      const response = (await chrome.runtime
        .sendMessage({ type: "GET_SETTINGS" })) as RuntimeMessageResponse;

        if (response.type === "SETTINGS_STATE") {
          setSettings(response.settings);
          if (response.settings.github.repository.trim()) {
            openOptions();
            window.close();
            return;
          }
          if (
            (initialMode === "link" || initialMode === "new") &&
            response.settings.github.token.trim()
          ) {
            setMode(initialMode);
            if (initialMode === "link" && response.settings.github.token.trim()) {
              void loadRepositories(response.settings.github.token);
            }
          }
        }
      })();

    const handleStorageChange: Parameters<
      typeof chrome.storage.onChanged.addListener
    >[0] = (changes, areaName) => {
      if (areaName !== "local") {
        return;
      }

      if (changes.settings?.newValue) {
        setSettings(changes.settings.newValue as ExtensionSettings);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [loadRepositories]);

  async function handleAuthenticateGitHub() {
    const response = (await chrome.runtime.sendMessage({
      type: "START_GITHUB_WEB_AUTH",
      nextMode: "link",
    })) as RuntimeMessageResponse;

    if (response.type !== "GITHUB_WEB_AUTH_START" || !response.ok) {
      setMessage(
        response.type === "GITHUB_WEB_AUTH_START"
          ? response.reason
          : "Failed to start GitHub authentication."
      );
      return;
    }

    await chrome.tabs.create({ url: response.url });
  }

  async function handleContinue() {
    if (!mode) {
      setMessage("Select an option first.");
      return;
    }

    if (mode === "new" && !repositoryName.trim()) {
      setMessage("Enter a repository name first.");
      return;
    }

    if (mode === "link" && !selectedRepository.trim()) {
      setMessage("Select a repository first.");
      return;
    }

    setSubmitting(true);
    setMessage(mode === "new" ? "Creating repository..." : "Linking repository...");

    const response = (await chrome.runtime.sendMessage(
      mode === "new"
        ? {
            type: "CREATE_GITHUB_REPOSITORY",
            name: repositoryName.trim(),
            private: true,
          }
        : {
            type: "LINK_GITHUB_REPOSITORY",
            repository: selectedRepository,
          }
    )) as RuntimeMessageResponse;

    setSubmitting(false);

    if (response.type === "GITHUB_REPOSITORY_UPDATE") {
      if (response.ok) {
        setSettings(response.settings);
        openOptions();
        window.close();
        return;
      }

      setMessage(response.reason);
    }
  }

  const isGetStartedDisabled =
    submitting ||
    !mode ||
    (mode === "new" && !repositoryName.trim()) ||
    (mode === "link" && !selectedRepository.trim());

  const pageClass =
    resolvedTheme === "dark"
      ? "min-h-screen bg-[radial-gradient(circle_at_20%_0%,_rgba(251,191,36,0.16),_transparent_34%),radial-gradient(circle_at_100%_100%,_rgba(245,158,11,0.12),_transparent_38%),linear-gradient(180deg,_#19110b,_#090909)] text-stone-100"
      : "min-h-screen bg-[radial-gradient(circle_at_20%_0%,_rgba(251,191,36,0.16),_transparent_32%),radial-gradient(circle_at_100%_100%,_rgba(245,158,11,0.10),_transparent_36%),linear-gradient(180deg,_#fcf5e8,_#fffdf8)] text-stone-900";
  const shellClass =
    resolvedTheme === "dark"
      ? "border-amber-950/60 bg-[linear-gradient(180deg,rgba(41,24,13,0.96),rgba(10,10,10,0.96))] shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
      : "border-amber-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(255,247,232,0.98))] shadow-[0_24px_64px_rgba(180,120,0,0.10)]";
  const panelClass =
    resolvedTheme === "dark"
      ? "border-stone-800 bg-stone-950/60"
      : "border-amber-300 bg-white";

  return (
    <main className={`${pageClass} px-6 py-10`}>
      <div className="mx-auto max-w-3xl">
        <section className={`rounded-[32px] border p-8 ${shellClass}`}>
          <div className="text-center">
            <BrandWordmark size="xl" align="center" />
            <p
              className={`mt-4 text-lg ${
                resolvedTheme === "dark" ? "text-stone-400" : "text-stone-700"
              }`}
            >
              Automatically sync your accepted LeetCode and Programmers solutions to GitHub.
            </p>
          </div>

          <section className={`mx-auto mt-10 max-w-2xl rounded-[24px] border p-6 ${panelClass}`}>
            <p
              className={`text-center text-xl font-semibold ${
                resolvedTheme === "dark" ? "text-stone-50" : "text-stone-900"
              }`}
            >
              Connect a repository to get started
            </p>

            <div className="mt-6">
              <label
                htmlFor="setupMode"
                className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500"
              >
                Setup option
              </label>
              <select
                id="setupMode"
                className={`mt-2 w-full rounded-[16px] border px-4 py-3 text-sm outline-none transition ${
                  resolvedTheme === "dark"
                    ? "border-stone-800 bg-stone-900/80 text-stone-100 focus:border-amber-400"
                    : "border-amber-300 bg-white text-stone-900 focus:border-amber-600"
                }`}
                value={mode}
                onChange={(event) => {
                  const nextMode = event.target.value as RepoMode;
                  setMode(nextMode);
                  if (nextMode !== "link") {
                    setAvailableRepositories([]);
                    setSelectedRepository("");
                  } else if (settings.github.token.trim()) {
                    void loadRepositories(settings.github.token);
                  }
                  setMessage("");
                }}
              >
                <option value="">Pick an option</option>
                <option value="new">Create a new private repository</option>
                <option value="link">Link an existing repository</option>
              </select>
            </div>

            {mode === "new" ? (
              <div className="mt-5">
                <label
                  htmlFor="repositoryName"
                  className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500"
                >
                  Repository name
                </label>
                <input
                  id="repositoryName"
                  className={`mt-2 w-full rounded-[16px] border px-4 py-3 text-sm outline-none transition placeholder:text-stone-500 ${
                    resolvedTheme === "dark"
                      ? "border-stone-800 bg-stone-900/80 text-stone-100 focus:border-amber-400"
                      : "border-amber-300 bg-white text-stone-900 focus:border-amber-600"
                  }`}
                  value={repositoryName}
                  onChange={(event) => setRepositoryName(event.target.value)}
                  placeholder="algorithm"
                />
              </div>
            ) : null}

            {mode === "link" ? (
              <div className="mt-5">
                {!settings.github.token.trim() ? (
                  <div
                    className={`rounded-[16px] border p-4 ${
                      resolvedTheme === "dark"
                        ? "border-stone-800 bg-stone-900/70"
                        : "border-amber-300 bg-amber-50"
                    }`}
                  >
                    <p
                      className={`text-sm ${
                        resolvedTheme === "dark" ? "text-stone-300" : "text-stone-700"
                      }`}
                    >
                      Authenticate with GitHub to load your repositories.
                    </p>
                    <button
                      className="mt-4 rounded-[16px] bg-stone-100 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-white"
                      onClick={() => void handleAuthenticateGitHub()}
                    >
                      Authenticate GitHub
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <label
                        htmlFor="existingRepository"
                        className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500"
                      >
                        Existing repository
                      </label>
                      <button
                        className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                          resolvedTheme === "dark"
                            ? "border-stone-800 bg-stone-900/80 text-stone-300 hover:border-amber-400 hover:text-amber-200"
                            : "border-amber-300 bg-white text-stone-700 hover:border-amber-500 hover:text-amber-800"
                        }`}
                        onClick={() => void handleAuthenticateGitHub()}
                        type="button"
                      >
                        Re-authenticate
                      </button>
                    </div>
                    <select
                      id="existingRepository"
                      className={`mt-2 w-full rounded-[16px] border px-4 py-3 text-sm outline-none transition ${
                        resolvedTheme === "dark"
                          ? "border-stone-800 bg-stone-900/80 text-stone-100 focus:border-amber-400"
                          : "border-amber-300 bg-white text-stone-900 focus:border-amber-600"
                      }`}
                      value={selectedRepository}
                      onChange={(event) => setSelectedRepository(event.target.value)}
                    >
                      <option value="">Select a repository</option>
                      {availableRepositories.map((repository) => (
                        <option key={repository.fullName} value={repository.fullName}>
                          {repository.fullName}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                className={`rounded-[16px] px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  resolvedTheme === "dark"
                    ? "bg-stone-100 text-stone-950 hover:bg-white"
                    : "bg-amber-500 text-white hover:bg-amber-600"
                }`}
                onClick={() => void handleContinue()}
                disabled={isGetStartedDisabled}
              >
                {submitting ? "Please wait..." : "Get Started"}
              </button>
            </div>

            {message ? (
              <p
                className={`mt-4 text-sm ${
                  resolvedTheme === "dark" ? "text-stone-300" : "text-stone-700"
                }`}
              >
                {message}
              </p>
            ) : null}
          </section>
        </section>
      </div>
    </main>
  );
}
