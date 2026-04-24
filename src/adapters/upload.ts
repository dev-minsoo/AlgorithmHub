import type { ProblemNoteRequest, UploadJob } from "../core/types/upload";
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

export async function appendProblemNoteThroughBackground(payload: ProblemNoteRequest) {
  const response = await sendRuntimeMessage({
    type: "APPEND_PROBLEM_NOTE",
    payload,
  });

  if (!response) {
    throw new Error("Extension context invalidated.");
  }

  if (response.type !== "APPEND_PROBLEM_NOTE_RESULT") {
    throw new Error("Unexpected note response.");
  }

  if (!response.ok) {
    throw new Error(response.reason);
  }

  return response.record;
}
