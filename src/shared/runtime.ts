import type { RuntimeMessage, RuntimeMessageResponse } from "../core/types/messages";

export async function sendRuntimeMessage<T extends RuntimeMessageResponse>(
  message: RuntimeMessage
): Promise<T | null> {
  const runtime = globalThis.chrome?.runtime;
  if (!runtime?.sendMessage) {
    return null;
  }

  try {
    return (await runtime.sendMessage(message)) as T;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    if (
      reason.includes("Extension context invalidated") ||
      reason.includes("Cannot read properties of undefined")
    ) {
      return null;
    }

    throw error;
  }
}
