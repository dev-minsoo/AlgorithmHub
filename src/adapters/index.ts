import { leetCodeAdapter } from "./leetcode";
import { programmersAdapter } from "./programmers";
import { hackerrankAdapter } from "./hackerrank";
import type { PlatformAdapter } from "./types";

const adapters: PlatformAdapter[] = [
  leetCodeAdapter,
  programmersAdapter,
  hackerrankAdapter,
];

export function getAdapterForUrl(url: URL): PlatformAdapter | null {
  return adapters.find((adapter) => adapter.canHandle(url)) ?? null;
}
