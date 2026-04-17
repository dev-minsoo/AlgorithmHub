import type { UploadRecord } from "../types/upload";

const MAX_UPLOAD_RECORDS = 20;

export async function getUploadHistory(): Promise<UploadRecord[]> {
  const { uploadHistory } = await chrome.storage.local.get("uploadHistory");
  return (uploadHistory as UploadRecord[] | undefined) ?? [];
}

export async function saveUploadRecord(record: UploadRecord): Promise<UploadRecord[]> {
  const current = await getUploadHistory();
  const next = [record, ...current.filter((item) => item.id !== record.id)].slice(
    0,
    MAX_UPLOAD_RECORDS
  );

  await chrome.storage.local.set({ uploadHistory: next });
  return next;
}
