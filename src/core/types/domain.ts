export type PlatformId = "leetcode" | "programmers" | "hackerrank";
export type RepositoryTemplateSegment = "platform" | "level" | "id" | "title";
export type Locale = "ko" | "en";
export type ThemeMode = "system" | "light" | "dark";

export type GitHubSettings = {
  oauthClientId: string;
  token: string;
  username: string;
  repository: string;
  branch: string;
};

export type PlatformSettings = {
  enabled: boolean;
  autoUpload: boolean;
  createProblemReadme: boolean;
  attachNotes: boolean;
};

export type ExtensionSettings = {
  locale: Locale;
  themeMode: ThemeMode;
  github: GitHubSettings;
  platforms: Record<PlatformId, PlatformSettings>;
  repositoryTemplate: Record<
    PlatformId,
    {
      order: RepositoryTemplateSegment[];
      enabled: Record<RepositoryTemplateSegment, boolean>;
      combineIdTitle: boolean;
    }
  >;
};

export type RepositoryInfo = {
  fullName: string;
  defaultBranch: string;
  private: boolean;
};

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
