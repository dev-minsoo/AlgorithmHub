import type { PlatformId } from "../core/types/domain";

import type { UploadJob } from "../core/types/upload";

export type PlatformAdapterContext = {
  platform: PlatformId;
};

export type PlatformAdapter = {
  platform: PlatformId;
  canHandle(url: URL): boolean;
  boot(context: PlatformAdapterContext): void | Promise<void>;
  onUrlChange?(url: URL): void;
};

export type SubmissionUploadDelegate = (job: UploadJob) => Promise<void>;
