type GitHubRepositoryResponse = {
  full_name: string;
  default_branch: string;
  private: boolean;
};

type GitHubUserResponse = {
  login: string;
};

type GitHubDeviceTokenError = {
  error: string;
  error_description?: string;
};

type GitHubOAuthTokenSuccess = {
  access_token: string;
  token_type: string;
  scope: string;
};

type GitHubReferenceResponse = {
  ref: string;
  object: { sha: string };
};

type CreateTreeItem = {
  path: string;
  mode: "100644";
  type: "blob";
  content: string;
};

type CreateTreeResponse = {
  sha: string;
  tree: Array<{ path: string; sha: string }>;
};

type CreateCommitResponse = {
  sha: string;
};

class GitHubApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
  }
}

async function handleGitHubResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;

    throw new GitHubApiError(
      body?.message ?? `GitHub API error: ${response.status}`,
      response.status
    );
  }

  return (await response.json()) as T;
}

export function createGitHubClient(token: string) {
  const headers = {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github.v3+json",
    "content-type": "application/json",
  };

  return {
    async getRepository(fullName: string): Promise<GitHubRepositoryResponse> {
      const response = await fetch(`https://api.github.com/repos/${fullName}`, {
        method: "GET",
        headers,
      });

      return handleGitHubResponse<GitHubRepositoryResponse>(response);
    },
    async getCurrentUser(): Promise<GitHubUserResponse> {
      const response = await fetch("https://api.github.com/user", {
        method: "GET",
        headers,
      });

      return handleGitHubResponse<GitHubUserResponse>(response);
    },
    async createRepository(name: string, isPrivate: boolean) {
      const response = await fetch("https://api.github.com/user/repos", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name,
          private: isPrivate,
          auto_init: false,
          description:
            "Archive of accepted LeetCode and Programmers solutions, synced by AlgorithmHub.",
        }),
      });

      return handleGitHubResponse<GitHubRepositoryResponse>(response);
    },
    async createRepositoryFile(
      fullName: string,
      path: string,
      content: string,
      message: string,
      branch: string
    ) {
      const response = await fetch(
        `https://api.github.com/repos/${fullName}/contents/${encodeURIComponent(path)}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({
            message,
            content: btoa(unescape(encodeURIComponent(content))),
            branch,
          }),
        }
      );

      return handleGitHubResponse<{
        content: { path: string; sha: string };
        commit: { sha: string; message: string };
      }>(response);
    },
    async updateRepository(
      fullName: string,
      payload: {
        description?: string;
      }
    ) {
      const response = await fetch(`https://api.github.com/repos/${fullName}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(payload),
      });

      return handleGitHubResponse<GitHubRepositoryResponse>(response);
    },
    async listRepositories(): Promise<GitHubRepositoryResponse[]> {
      const response = await fetch(
        "https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member",
        {
          method: "GET",
          headers,
        }
      );

      return handleGitHubResponse<GitHubRepositoryResponse[]>(response);
    },
    async getReference(fullName: string, branch: string) {
      const response = await fetch(
        `https://api.github.com/repos/${fullName}/git/refs/heads/${branch}`,
        {
          method: "GET",
          headers,
        }
      );

      const data = await handleGitHubResponse<GitHubReferenceResponse>(response);
      return { ref: data.ref, refSha: data.object.sha };
    },
    async createTree(
      fullName: string,
      baseTree: string,
      items: CreateTreeItem[]
    ): Promise<CreateTreeResponse> {
      const response = await fetch(
        `https://api.github.com/repos/${fullName}/git/trees`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ base_tree: baseTree, tree: items }),
        }
      );

      return handleGitHubResponse<CreateTreeResponse>(response);
    },
    async createCommit(
      fullName: string,
      message: string,
      treeSha: string,
      parentSha: string
    ): Promise<CreateCommitResponse> {
      const response = await fetch(
        `https://api.github.com/repos/${fullName}/git/commits`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            message,
            tree: treeSha,
            parents: [parentSha],
          }),
        }
      );

      return handleGitHubResponse<CreateCommitResponse>(response);
    },
    async updateReference(fullName: string, ref: string, commitSha: string) {
      const response = await fetch(`https://api.github.com/repos/${fullName}/git/${ref}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ sha: commitSha, force: true }),
      });

      return handleGitHubResponse<{ object: { sha: string } }>(response);
    },
  };
}

export async function exchangeGitHubOAuthCode(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
) {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new GitHubApiError(`GitHub OAuth error: ${response.status}`, response.status);
  }

  const payload = (await response.json()) as
    | GitHubOAuthTokenSuccess
    | GitHubDeviceTokenError;

  if ("error" in payload) {
    throw new GitHubApiError(payload.error_description ?? payload.error, 400);
  }

  return payload;
}
