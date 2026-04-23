import type { PlatformId } from "./domain";

export type UploadFile = {
  path: string;
  content: string;
};

export type UploadJob = {
  id: string;
  platform: PlatformId;
  problemId: string;
  title: string;
  directory: string;
  commitMessage: string;
  files: UploadFile[];
  rootFiles?: UploadFile[];
  metadata?: Record<string, string>;
};

export type UploadRecord = {
  id: string;
  platform: PlatformId;
  repository: string;
  branch: string;
  commitSha: string;
  commitMessage: string;
  uploadedAt: number;
  filePaths: string[];
};

export type ProblemNoteRequest = {
  platform: PlatformId;
  problemId: string;
  title: string;
  directory: string;
  note: string;
};
