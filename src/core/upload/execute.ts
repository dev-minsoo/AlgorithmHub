import { createGitHubClient } from "../github/client";
import type { ExtensionSettings } from "../types/domain";
import type { UploadJob, UploadRecord } from "../types/upload";

function resolveBranch(settings: ExtensionSettings, defaultBranch: string) {
  return settings.github.branch.trim() || defaultBranch;
}

export async function executeUploadJob(
  job: UploadJob,
  settings: ExtensionSettings
): Promise<UploadRecord> {
  const token = settings.github.token.trim();
  const repository = settings.github.repository.trim();

  if (!token || !repository) {
    throw new Error("GitHub token and repository must be configured.");
  }

  if (job.files.length === 0) {
    throw new Error("Upload job must contain at least one file.");
  }

  const github = createGitHubClient(token);
  const repo = await github.getRepository(repository);
  const branch = resolveBranch(settings, repo.default_branch);
  const { ref, refSha } = await github.getReference(repository, branch);
  const tree = await github.createTree(
    repository,
    refSha,
    [
      ...job.files.map((file) => ({
        path: `${job.directory}/${file.path}`,
        mode: "100644" as const,
        type: "blob" as const,
        content: file.content,
      })),
      ...(job.rootFiles ?? []).map((file) => ({
        path: file.path,
        mode: "100644" as const,
        type: "blob" as const,
        content: file.content,
      })),
    ]
  );
  const commit = await github.createCommit(
    repository,
    job.commitMessage,
    tree.sha,
    refSha
  );

  await github.updateReference(repository, ref, commit.sha);

  return {
    id: job.id,
    platform: job.platform,
    repository,
    branch,
    commitSha: commit.sha,
    commitMessage: job.commitMessage,
    uploadedAt: Date.now(),
    filePaths: [
      ...job.files.map((file) => `${job.directory}/${file.path}`),
      ...(job.rootFiles ?? []).map((file) => file.path),
    ],
  };
}
