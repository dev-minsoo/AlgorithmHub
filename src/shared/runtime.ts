import type { RuntimeMessage, RuntimeMessageResponse } from "../core/types/messages";

export async function sendRuntimeMessage<T extends RuntimeMessageResponse>(
  message: RuntimeMessage
): Promise<T | null> {
  try {
    return (await chrome.runtime.sendMessage(message)) as T;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    if (reason.includes("Extension context invalidated")) {
      return null;
    }

    throw error;
  }
}
