import type { PlatformId } from "./types/domain";

export type PlatformDefinition = {
  id: PlatformId;
  displayName: string;
  rootLabel: string;
  solveUrl: string;
  pathPreview: {
    level: string;
    id: string;
    title: string;
    fileName: string;
  };
};

export const PLATFORM_IDS: PlatformId[] = [
  "leetcode",
  "programmers",
  "hackerrank",
];

export const PLATFORM_DEFINITIONS: Record<PlatformId, PlatformDefinition> = {
  leetcode: {
    id: "leetcode",
    displayName: "LeetCode",
    rootLabel: "Leetcode",
    solveUrl: "https://leetcode.com/",
    pathPreview: {
      level: "Easy",
      id: "0001",
      title: "Two Sum",
      fileName: "solution.py",
    },
  },
  programmers: {
    id: "programmers",
    displayName: "프로그래머스",
    rootLabel: "프로그래머스",
    solveUrl: "https://school.programmers.co.kr/learn/challenges",
    pathPreview: {
      level: "Lv. 2",
      id: "12909",
      title: "올바른 괄호",
      fileName: "solution.js",
    },
  },
  hackerrank: {
    id: "hackerrank",
    displayName: "HackerRank",
    rootLabel: "HackerRank",
    solveUrl: "https://www.hackerrank.com/domains",
    pathPreview: {
      level: "Data Structures",
      id: "13579",
      title: "Arrays - DS",
      fileName: "arrays-ds.kt",
    },
  },
};

export function getPlatformDefinition(platform: PlatformId) {
  return PLATFORM_DEFINITIONS[platform];
}
