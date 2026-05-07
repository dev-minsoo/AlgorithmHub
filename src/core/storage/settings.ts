import type {
  DeepPartial,
  ExtensionSettings,
  PlatformId,
  PlatformSettings,
  RepositoryTemplateSegment,
} from "../types/domain";
import { PLATFORM_IDS } from "../platforms";

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

function createDefaultPlatformSettings(): PlatformSettings {
  return {
    enabled: true,
    autoUpload: true,
    createProblemReadme: true,
    attachNotes: false,
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
    leetcode: createDefaultPlatformSettings(),
    programmers: createDefaultPlatformSettings(),
    hackerrank: createDefaultPlatformSettings(),
  },
  repositoryTemplate: {
    leetcode: createDefaultTemplateConfig(),
    programmers: createDefaultTemplateConfig(),
    hackerrank: createDefaultTemplateConfig(),
  },
};

function mergePlatformSettings(
  current: ExtensionSettings["platforms"],
  patch: DeepPartial<ExtensionSettings>["platforms"]
): ExtensionSettings["platforms"] {
  return PLATFORM_IDS.reduce((platforms, platform) => {
    platforms[platform] = {
      ...current[platform],
      ...(patch?.[platform] as Partial<PlatformSettings> | undefined),
    };
    return platforms;
  }, {} as Record<PlatformId, PlatformSettings>);
}

function sanitizeTemplateOrder(order: unknown) {
  if (!Array.isArray(order)) {
    return null;
  }

  return order.filter(
    (segment): segment is RepositoryTemplateSegment =>
      segment === "platform" ||
      segment === "level" ||
      segment === "id" ||
      segment === "title"
  );
}

function mergeRepositoryTemplate(
  current: ExtensionSettings["repositoryTemplate"],
  patch: DeepPartial<ExtensionSettings>["repositoryTemplate"]
): ExtensionSettings["repositoryTemplate"] {
  return PLATFORM_IDS.reduce((repositoryTemplate, platform) => {
    const patchTemplate = patch?.[platform];

    repositoryTemplate[platform] = {
      ...current[platform],
      ...patchTemplate,
      order: sanitizeTemplateOrder(patchTemplate?.order) ?? current[platform].order,
      enabled: {
        ...current[platform].enabled,
        ...patchTemplate?.enabled,
      },
      combineIdTitle:
        patchTemplate?.combineIdTitle ?? current[platform].combineIdTitle,
    };
    return repositoryTemplate;
  }, {} as ExtensionSettings["repositoryTemplate"]);
}

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
    platforms: mergePlatformSettings(current.platforms, patch.platforms),
    repositoryTemplate: mergeRepositoryTemplate(
      current.repositoryTemplate,
      patch.repositoryTemplate
    ),
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
