import type { UploadJob } from "../core/types/upload";
import { sendRuntimeMessage } from "../shared/runtime";

export async function uploadThroughBackground(job: UploadJob) {
  const response = await sendRuntimeMessage({
    type: "UPLOAD_JOB",
    job,
  });

  if (!response) {
    throw new Error("Extension context invalidated.");
  }

  if (response.type !== "UPLOAD_RESULT") {
    throw new Error("Unexpected upload response.");
  }

  if (!response.ok) {
    throw new Error(response.reason);
  }

  return response.record;
}
