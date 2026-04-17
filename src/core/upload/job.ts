import type { UploadFile, UploadJob } from "../types/upload";

export function createUploadJob(
  job: Omit<UploadJob, "files"> & { files?: UploadFile[] }
): UploadJob {
  return {
    ...job,
    files: job.files ?? [],
    rootFiles: job.rootFiles ?? [],
  };
}

export function addUploadFile(job: UploadJob, file: UploadFile): UploadJob {
  return {
    ...job,
    files: [...job.files, file],
  };
}
