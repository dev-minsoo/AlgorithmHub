import type {
  DeepPartial,
  ExtensionSettings,
  RepositoryTemplateSegment,
} from "../types/domain";

export const DEFAULT_GITHUB_OAUTH_CLIENT_ID = "Ov23liLxRpRqCrpLKjYy";

function createDefaultTemplateConfig() {
  return {
    order: [
      "platform",
      "level",
      "id",
      "title",
    ] as RepositoryTemplateSegment[],
    enabled: {
      platform: true,
      level: true,
      id: true,
      title: true,
    },
    combineIdTitle: true,
  };
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  locale: "en",
  themeMode: "system",
  github: {
    oauthClientId: DEFAULT_GITHUB_OAUTH_CLIENT_ID,
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
    leetcode: createDefaultTemplateConfig(),
    programmers: createDefaultTemplateConfig(),
  },
};

function mergeSettings(
  current: ExtensionSettings,
  patch: DeepPartial<ExtensionSettings>
): ExtensionSettings {
  return {
    locale: patch.locale ?? current.locale,
    themeMode: patch.themeMode ?? current.themeMode,
    github: {
      ...current.github,
      ...patch.github,
    },
    platforms: {
      leetcode: {
        ...current.platforms.leetcode,
        ...patch.platforms?.leetcode,
      },
      programmers: {
        ...current.platforms.programmers,
        ...patch.platforms?.programmers,
      },
    },
    repositoryTemplate: {
      leetcode: {
        ...current.repositoryTemplate.leetcode,
        ...patch.repositoryTemplate?.leetcode,
        order:
          patch.repositoryTemplate?.leetcode?.order?.filter(
            (segment): segment is "platform" | "level" | "id" | "title" =>
              Boolean(segment)
          ) ?? current.repositoryTemplate.leetcode.order,
        enabled: {
          ...current.repositoryTemplate.leetcode.enabled,
          ...patch.repositoryTemplate?.leetcode?.enabled,
        },
        combineIdTitle:
          patch.repositoryTemplate?.leetcode?.combineIdTitle ??
          current.repositoryTemplate.leetcode.combineIdTitle,
      },
      programmers: {
        ...current.repositoryTemplate.programmers,
        ...patch.repositoryTemplate?.programmers,
        order:
          patch.repositoryTemplate?.programmers?.order?.filter(
            (segment): segment is "platform" | "level" | "id" | "title" =>
              Boolean(segment)
          ) ?? current.repositoryTemplate.programmers.order,
        enabled: {
          ...current.repositoryTemplate.programmers.enabled,
          ...patch.repositoryTemplate?.programmers?.enabled,
        },
        combineIdTitle:
          patch.repositoryTemplate?.programmers?.combineIdTitle ??
          current.repositoryTemplate.programmers.combineIdTitle,
      },
    },
  };
}

export async function getSettings(): Promise<ExtensionSettings> {
  const { settings } = await chrome.storage.local.get("settings");

  if (!settings) {
    return DEFAULT_SETTINGS;
  }

  return mergeSettings(DEFAULT_SETTINGS, settings as Partial<ExtensionSettings>);
}

export async function saveSettings(
  patch: DeepPartial<ExtensionSettings>
): Promise<ExtensionSettings> {
  const current = await getSettings();
  const next = mergeSettings(current, patch);
  await chrome.storage.local.set({ settings: next });
  return next;
}
