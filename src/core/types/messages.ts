import type {
  DeepPartial,
  ExtensionSettings,
  RepositoryInfo,
} from "./domain";
import type { UploadJob, UploadRecord } from "./upload";

export type RuntimeMessage =
  | { type: "PING" }
  | { type: "GET_SETTINGS" }
  | { type: "SAVE_SETTINGS"; settings: DeepPartial<ExtensionSettings> }
  | { type: "START_GITHUB_WEB_AUTH"; nextMode?: "link" | "new" }
  | {
      type: "COMPLETE_GITHUB_WEB_AUTH";
      code: string | null;
      state: string | null;
      error: string | null;
    }
  | { type: "LIST_GITHUB_REPOSITORIES" }
  | { type: "CREATE_GITHUB_REPOSITORY"; name: string; private: boolean }
  | { type: "LINK_GITHUB_REPOSITORY"; repository: string }
  | { type: "DISCONNECT_GITHUB_REPOSITORY" }
  | { type: "UPLOAD_JOB"; job: UploadJob };

export type RuntimeMessageResponse =
  | { type: "PONG"; timestamp: number }
  | { type: "SETTINGS_STATE"; settings: ExtensionSettings }
  | { type: "SETTINGS_SAVED"; settings: ExtensionSettings }
  | { type: "UPLOAD_RESULT"; ok: true; record: UploadRecord }
  | { type: "UPLOAD_RESULT"; ok: false; reason: string; jobId: string }
  | { type: "GITHUB_WEB_AUTH_START"; ok: true; url: string }
  | { type: "GITHUB_WEB_AUTH_START"; ok: false; reason: string }
  | { type: "GITHUB_WEB_AUTH_RESULT"; ok: true; settings: ExtensionSettings }
  | { type: "GITHUB_WEB_AUTH_RESULT"; ok: false; reason: string }
  | { type: "GITHUB_REPOSITORIES"; ok: true; repositories: RepositoryInfo[] }
  | { type: "GITHUB_REPOSITORIES"; ok: false; reason: string }
  | { type: "GITHUB_REPOSITORY_UPDATE"; ok: true; settings: ExtensionSettings; repository: RepositoryInfo }
  | { type: "GITHUB_REPOSITORY_UPDATE"; ok: false; reason: string }
