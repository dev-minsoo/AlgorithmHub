import type {
  PlatformId,
  RepositoryTemplateSegment,
} from "../types/domain";
import { getPlatformDefinition } from "../platforms";

export type RepositoryPathParts = {
  platform: string;
  level: string;
  id: string;
  title: string;
};

export const TEMPLATE_SEGMENT_LABELS: Record<RepositoryTemplateSegment, string> = {
  platform: "Platform",
  level: "Level",
  id: "ID",
  title: "Title",
};

export function normalizePathSegment(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim();
}

export function getPlatformRootLabel(platform: PlatformId) {
  return getPlatformDefinition(platform).rootLabel;
}

export function buildRepositoryDirectory(
  template: {
    order: RepositoryTemplateSegment[];
    enabled: Record<RepositoryTemplateSegment, boolean>;
    combineIdTitle: boolean;
  },
  parts: RepositoryPathParts
) {
  const enabledSegments = template.order.filter((segment) => template.enabled[segment]);
  const segmentsToUse: RepositoryTemplateSegment[] =
    enabledSegments.length > 0 ? enabledSegments : ["platform"];
  const pathSegments: string[] = [];

  for (let index = 0; index < segmentsToUse.length; index += 1) {
    const segment = segmentsToUse[index];
    const nextSegment = segmentsToUse[index + 1];

    if (template.combineIdTitle && segment === "id" && nextSegment === "title") {
      const combined = normalizePathSegment(`${parts.id}. ${parts.title}`);
      if (combined) {
        pathSegments.push(combined);
      }
      index += 1;
      continue;
    }

    const value = normalizePathSegment(parts[segment]);
    if (value) {
      pathSegments.push(value);
    }
  }

  return pathSegments.join("/");
}
