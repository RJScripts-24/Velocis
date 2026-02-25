// src/services/github/repoOps.ts
// All GitHub repository operations for Velocis
// Handles: fetching files, pushing PRs, posting review comments,
//          listing repos, triggering check runs, fetching diffs
// All operations use installation tokens (app-level auth via auth.ts)

import { Octokit } from "@octokit/rest";
import { throttling } from "@octokit/plugin-throttling";
import { retry } from "@octokit/plugin-retry";
import { getInstallationToken } from "./auth";
import { logger } from "../../utils/logger";
import { config } from "../../utils/config";

// ─────────────────────────────────────────────
// OCTOKIT WITH PLUGINS
// throttling: auto-handles GitHub rate limit 429s
// retry: auto-retries on 5xx errors (up to 3 times)
// ─────────────────────────────────────────────

const ThrottledOctokit = Octokit.plugin(throttling, retry);

function buildOctokit(token: string): Octokit {
  return new ThrottledOctokit({
    auth: token,
    throttle: {
      onRateLimit: (retryAfter: number, options: any, octokit: any, retryCount: number) => {
        logger.warn({
          msg: "repoOps: GitHub rate limit hit",
          retryAfter,
          method: options.method,
          url: options.url,
          retryCount,
        });
        // Retry up to 2 times on rate limit
        return retryCount < 2;
      },
      onSecondaryRateLimit: (retryAfter: number, options: any) => {
        logger.warn({
          msg: "repoOps: GitHub secondary rate limit hit",
          retryAfter,
          method: options.method,
          url: options.url,
        });
        // Do not retry secondary rate limits — back off completely
        return false;
      },
    },
    retry: {
      doNotRetry: ["429"],  // Throttling plugin handles 429 — don't double retry
    },
  }) as unknown as Octokit;
}

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface FetchFileContentsParams {
  repoFullName: string;       // "owner/repo"
  filePaths: string[];        // ["src/index.ts", "src/utils.ts"]
  token: string;              // Installation token from auth.ts
  ref?: string;               // Branch/SHA — defaults to default branch
}

export interface FileContent {
  path: string;
  content: string;            // Decoded UTF-8 file content
  sha: string;                // File blob SHA — needed for updates
  encoding: string;
  size: number;
  url: string;
}

export interface FetchFileContentsResult {
  files: Record<string, FileContent>;   // path → FileContent
  failedPaths: string[];                // Paths that couldn't be fetched
}

export interface PushPRCommentParams {
  repoFullName: string;
  prNumber: number;
  body: string;               // Markdown comment body (Sentinel's review)
  token: string;
}

export interface CreatePRParams {
  repoFullName: string;
  title: string;
  body: string;               // PR description markdown
  headBranch: string;         // Branch with Fortress's fixes
  baseBranch: string;         // Target branch (usually default)
  token: string;
  draft?: boolean;
}

export interface CreatePRResult {
  prNumber: number;
  prUrl: string;
  headBranch: string;
  baseBranch: string;
}

export interface PushFileParams {
  repoFullName: string;
  filePath: string;
  content: string;            // New file content (UTF-8)
  commitMessage: string;
  branch: string;
  token: string;
  existingFileSha?: string;   // Required if updating an existing file
}

export interface CreateBranchParams {
  repoFullName: string;
  branchName: string;
  fromSha: string;            // SHA to branch from
  token: string;
}

export interface FetchDiffParams {
  repoFullName: string;
  baseSha: string;            // The "before" SHA from the push event
  headSha: string;            // The "after" SHA from the push event
  token: string;
}

export interface FileDiff {
  filename: string;
  status: "added" | "modified" | "removed" | "renamed" | "copied" | "changed" | "unchanged";
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;             // The actual diff patch — may be absent for binary files
  previousFilename?: string;  // Present for renamed files
}

export interface FetchDiffResult {
  files: FileDiff[];
  totalAdditions: number;
  totalDeletions: number;
  aheadBy: number;
  behindBy: number;
  status: string;
}

export interface ListReposParams {
  token: string;              // User OAuth token (not installation token)
  page?: number;
  perPage?: number;
  sort?: "created" | "updated" | "pushed" | "full_name";
  visibility?: "all" | "public" | "private";
}

export interface GitHubRepoSummary {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  description: string | null;
  defaultBranch: string;
  language: string | null;
  visibility: string;
  htmlUrl: string;
  updatedAt: string | null;
  pushedAt: string | null;
  size: number;
  openIssuesCount: number;
  stargazersCount: number;
}

export interface CreateCheckRunParams {
  repoFullName: string;
  name: string;               // e.g. "Fortress TDD"
  headSha: string;
  status: "queued" | "in_progress" | "completed";
  conclusion?: CheckRunConclusion;
  title: string;
  summary: string;            // Markdown summary shown in GitHub UI
  annotations?: CheckRunAnnotation[];
  token: string;
}

export interface UpdateCheckRunParams extends CreateCheckRunParams {
  checkRunId: number;
}

export type CheckRunConclusion =
  | "success"
  | "failure"
  | "neutral"
  | "cancelled"
  | "skipped"
  | "timed_out"
  | "action_required";

export interface CheckRunAnnotation {
  path: string;               // File path
  startLine: number;
  endLine: number;
  annotationLevel: "notice" | "warning" | "failure";
  message: string;
  title?: string;
  rawDetails?: string;
}

export interface FetchRepoTreeParams {
  repoFullName: string;
  token: string;
  ref?: string;               // Branch/SHA — defaults to HEAD
  recursive?: boolean;        // Fetch entire tree recursively
}

export interface RepoTreeItem {
  path: string;
  type: "blob" | "tree";      // blob = file, tree = directory
  sha: string;
  size?: number;
  url: string;
}

// ─────────────────────────────────────────────
// FILE OPERATIONS
// ─────────────────────────────────────────────

/**
 * Fetches the content of multiple files from a GitHub repository.
 * Runs fetches concurrently with a 10-file batch limit to respect rate limits.
 * Files that fail (deleted, binary, too large) are tracked in failedPaths.
 *
 * @example
 * const { files, failedPaths } = await repoOps.fetchFileContents({
 *   repoFullName: "owner/velocis",
 *   filePaths: ["src/index.ts", "src/utils.ts"],
 *   token: installationToken,
 * });
 */
async function fetchFileContents(
  params: FetchFileContentsParams
): Promise<FetchFileContentsResult> {
  const { repoFullName, filePaths, token, ref } = params;
  const [owner, repo] = splitRepoFullName(repoFullName);
  const octokit = buildOctokit(token);

  const files: Record<string, FileContent> = {};
  const failedPaths: string[] = [];

  // Batch into groups of 10 to avoid secondary rate limits
  const batches = chunkArray(filePaths, 10);

  logger.info({
    msg: "repoOps.fetchFileContents: starting",
    repoFullName,
    totalFiles: filePaths.length,
    batches: batches.length,
  });

  for (const batch of batches) {
    const results = await Promise.allSettled(
      batch.map(async (filePath) => {
        const response = await octokit.repos.getContent({
          owner,
          repo,
          path: filePath,
          ...(ref && { ref }),
        });

        const data = response.data;

        // getContent can return a file, directory, or symlink
        // We only want files (type === "file")
        if (Array.isArray(data) || data.type !== "file") {
          throw new Error(`Path '${filePath}' is not a file`);
        }

        // GitHub returns base64-encoded content
        if (data.encoding !== "base64") {
          throw new Error(`Unexpected encoding '${data.encoding}' for '${filePath}'`);
        }

        const content = Buffer.from(data.content, "base64").toString("utf8");

        return {
          path: filePath,
          content,
          sha: data.sha,
          encoding: data.encoding,
          size: data.size,
          url: data.html_url ?? data.url,
        } satisfies FileContent;
      })
    );

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        files[batch[index]] = result.value;
      } else {
        logger.warn({
          msg: `repoOps.fetchFileContents: failed to fetch '${batch[index]}'`,
          error: String(result.reason),
        });
        failedPaths.push(batch[index]);
      }
    });
  }

  logger.info({
    msg: "repoOps.fetchFileContents: complete",
    repoFullName,
    fetched: Object.keys(files).length,
    failed: failedPaths.length,
  });

  return { files, failedPaths };
}

/**
 * Pushes a single file to a GitHub repository.
 * Creates the file if it doesn't exist, updates it if existingFileSha is provided.
 * Used by Fortress to push auto-generated test files.
 *
 * @example
 * await repoOps.pushFile({
 *   repoFullName: "owner/velocis",
 *   filePath: "tests/auth.test.ts",
 *   content: generatedTestCode,
 *   commitMessage: "chore(fortress): auto-generate unit tests for auth.ts",
 *   branch: "velocis/fortress-tests",
 *   token: installationToken,
 * });
 */
async function pushFile(params: PushFileParams): Promise<void> {
  const {
    repoFullName,
    filePath,
    content,
    commitMessage,
    branch,
    token,
    existingFileSha,
  } = params;

  const [owner, repo] = splitRepoFullName(repoFullName);
  const octokit = buildOctokit(token);

  // GitHub requires base64-encoded content
  const encodedContent = Buffer.from(content, "utf8").toString("base64");

  try {
    logger.info({
      msg: "repoOps.pushFile",
      repoFullName,
      filePath,
      branch,
      isUpdate: !!existingFileSha,
    });

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: commitMessage,
      content: encodedContent,
      branch,
      ...(existingFileSha && { sha: existingFileSha }),
      committer: {
        name: "Velocis AI",
        email: "velocis-bot@velocis.dev",
      },
      author: {
        name: "Velocis AI",
        email: "velocis-bot@velocis.dev",
      },
    });

    logger.info({
      msg: "repoOps.pushFile: success",
      repoFullName,
      filePath,
      branch,
    });
  } catch (err) {
    logger.error({
      msg: "repoOps.pushFile: failed",
      repoFullName,
      filePath,
      error: String(err),
    });
    throw new RepoOpsError("pushFile", repoFullName, err);
  }
}

/**
 * Pushes multiple files to a repository in a single batch operation.
 * Uses the Git Trees API for atomic multi-file commits —
 * all files commit together or none do.
 * Used by Fortress when pushing multiple test files at once.
 *
 * @example
 * await repoOps.pushMultipleFiles({
 *   repoFullName: "owner/velocis",
 *   files: { "tests/auth.test.ts": authTests, "tests/repo.test.ts": repoTests },
 *   commitMessage: "chore(fortress): auto-generate test suite",
 *   branch: "velocis/fortress-tests",
 *   token: installationToken,
 * });
 */
async function pushMultipleFiles(params: {
  repoFullName: string;
  files: Record<string, string>;   // filePath → content
  commitMessage: string;
  branch: string;
  token: string;
}): Promise<void> {
  const { repoFullName, files, commitMessage, branch, token } = params;
  const [owner, repo] = splitRepoFullName(repoFullName);
  const octokit = buildOctokit(token);

  try {
    logger.info({
      msg: "repoOps.pushMultipleFiles: starting",
      repoFullName,
      fileCount: Object.keys(files).length,
      branch,
    });

    // ── Step 1: Get the current HEAD commit SHA of the branch ────────────
    const { data: refData } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });
    const latestCommitSha = refData.object.sha;

    // ── Step 2: Get the tree SHA of the current HEAD commit ──────────────
    const { data: commitData } = await octokit.git.getCommit({
      owner,
      repo,
      commit_sha: latestCommitSha,
    });
    const baseTreeSha = commitData.tree.sha;

    // ── Step 3: Create blobs for each new file ───────────────────────────
    const blobResults = await Promise.all(
      Object.entries(files).map(async ([filePath, content]) => {
        const { data: blob } = await octokit.git.createBlob({
          owner,
          repo,
          content: Buffer.from(content, "utf8").toString("base64"),
          encoding: "base64",
        });
        return { path: filePath, sha: blob.sha };
      })
    );

    // ── Step 4: Create a new tree with all file blobs ────────────────────
    const { data: newTree } = await octokit.git.createTree({
      owner,
      repo,
      base_tree: baseTreeSha,
      tree: blobResults.map(({ path, sha }) => ({
        path,
        mode: "100644",   // Regular file
        type: "blob",
        sha,
      })),
    });

    // ── Step 5: Create the commit ────────────────────────────────────────
    const { data: newCommit } = await octokit.git.createCommit({
      owner,
      repo,
      message: commitMessage,
      tree: newTree.sha,
      parents: [latestCommitSha],
      author: {
        name: "Velocis AI",
        email: "velocis-bot@velocis.dev",
        date: new Date().toISOString(),
      },
    });

    // ── Step 6: Update the branch ref to point to the new commit ────────
    await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: newCommit.sha,
    });

    logger.info({
      msg: "repoOps.pushMultipleFiles: success",
      repoFullName,
      branch,
      commitSha: newCommit.sha,
      filesCommitted: Object.keys(files).length,
    });
  } catch (err) {
    logger.error({
      msg: "repoOps.pushMultipleFiles: failed",
      repoFullName,
      branch,
      error: String(err),
    });
    throw new RepoOpsError("pushMultipleFiles", repoFullName, err);
  }
}

// ─────────────────────────────────────────────
// BRANCH OPERATIONS
// ─────────────────────────────────────────────

/**
 * Creates a new branch from a given SHA.
 * Fortress creates a "velocis/fortress-tests-{timestamp}" branch
 * before pushing auto-generated tests.
 *
 * @example
 * await repoOps.createBranch({
 *   repoFullName: "owner/velocis",
 *   branchName: `velocis/fortress-tests-${Date.now()}`,
 *   fromSha: headCommitSha,
 *   token: installationToken,
 * });
 */
async function createBranch(params: CreateBranchParams): Promise<void> {
  const { repoFullName, branchName, fromSha, token } = params;
  const [owner, repo] = splitRepoFullName(repoFullName);
  const octokit = buildOctokit(token);

  try {
    logger.info({
      msg: "repoOps.createBranch",
      repoFullName,
      branchName,
      fromSha,
    });

    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: fromSha,
    });

    logger.info({
      msg: "repoOps.createBranch: success",
      repoFullName,
      branchName,
    });
  } catch (err) {
    logger.error({
      msg: "repoOps.createBranch: failed",
      repoFullName,
      branchName,
      error: String(err),
    });
    throw new RepoOpsError("createBranch", repoFullName, err);
  }
}

/**
 * Checks if a branch exists in the repository.
 */
async function branchExists(params: {
  repoFullName: string;
  branchName: string;
  token: string;
}): Promise<boolean> {
  const { repoFullName, branchName, token } = params;
  const [owner, repo] = splitRepoFullName(repoFullName);
  const octokit = buildOctokit(token);

  try {
    await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${branchName}`,
    });
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────
// PULL REQUEST OPERATIONS
// ─────────────────────────────────────────────

/**
 * Creates a Pull Request from Fortress's auto-fix branch to the base branch.
 * The PR body contains Sentinel's review + Fortress's test results.
 *
 * @example
 * const pr = await repoOps.createPR({
 *   repoFullName: "owner/velocis",
 *   title: "🤖 Velocis: Auto-fix + Test Suite",
 *   body: prBody,
 *   headBranch: "velocis/fortress-tests-1234",
 *   baseBranch: "main",
 *   token: installationToken,
 * });
 */
async function createPR(params: CreatePRParams): Promise<CreatePRResult> {
  const {
    repoFullName,
    title,
    body,
    headBranch,
    baseBranch,
    token,
    draft = false,
  } = params;

  const [owner, repo] = splitRepoFullName(repoFullName);
  const octokit = buildOctokit(token);

  try {
    logger.info({
      msg: "repoOps.createPR",
      repoFullName,
      title,
      headBranch,
      baseBranch,
      draft,
    });

    const { data: pr } = await octokit.pulls.create({
      owner,
      repo,
      title,
      body,
      head: headBranch,
      base: baseBranch,
      draft,
    });

    logger.info({
      msg: "repoOps.createPR: success",
      repoFullName,
      prNumber: pr.number,
      prUrl: pr.html_url,
    });

    return {
      prNumber: pr.number,
      prUrl: pr.html_url,
      headBranch,
      baseBranch,
    };
  } catch (err) {
    logger.error({
      msg: "repoOps.createPR: failed",
      repoFullName,
      error: String(err),
    });
    throw new RepoOpsError("createPR", repoFullName, err);
  }
}

/**
 * Posts a review comment on a Pull Request.
 * Used by Sentinel to post its architectural review on the PR.
 *
 * @example
 * await repoOps.pushPRComment({
 *   repoFullName: "owner/velocis",
 *   prNumber: 42,
 *   body: sentinelReviewMarkdown,
 *   token: installationToken,
 * });
 */
async function pushPRComment(params: PushPRCommentParams): Promise<void> {
  const { repoFullName, prNumber, body, token } = params;
  const [owner, repo] = splitRepoFullName(repoFullName);
  const octokit = buildOctokit(token);

  try {
    logger.info({
      msg: "repoOps.pushPRComment",
      repoFullName,
      prNumber,
      bodyLength: body.length,
    });

    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,  // PRs are issues in GitHub's API
      body,
    });

    logger.info({
      msg: "repoOps.pushPRComment: success",
      repoFullName,
      prNumber,
    });
  } catch (err) {
    logger.error({
      msg: "repoOps.pushPRComment: failed",
      repoFullName,
      prNumber,
      error: String(err),
    });
    throw new RepoOpsError("pushPRComment", repoFullName, err);
  }
}

/**
 * Posts an inline code review comment on a specific line of a PR diff.
 * Used by Sentinel to annotate exact lines with specific feedback.
 */
async function pushInlinePRComment(params: {
  repoFullName: string;
  prNumber: number;
  body: string;
  commitId: string;     // The SHA of the commit being reviewed
  filePath: string;
  line: number;         // Line number in the diff
  token: string;
}): Promise<void> {
  const { repoFullName, prNumber, body, commitId, filePath, line, token } = params;
  const [owner, repo] = splitRepoFullName(repoFullName);
  const octokit = buildOctokit(token);

  try {
    await octokit.pulls.createReviewComment({
      owner,
      repo,
      pull_number: prNumber,
      body,
      commit_id: commitId,
      path: filePath,
      line,
      side: "RIGHT",    // RIGHT = new version of the file
    });

    logger.info({
      msg: "repoOps.pushInlinePRComment: success",
      repoFullName,
      prNumber,
      filePath,
      line,
    });
  } catch (err) {
    logger.error({
      msg: "repoOps.pushInlinePRComment: failed",
      repoFullName,
      filePath,
      error: String(err),
    });
    throw new RepoOpsError("pushInlinePRComment", repoFullName, err);
  }
}

// ─────────────────────────────────────────────
// DIFF OPERATIONS
// ─────────────────────────────────────────────

/**
 * Fetches the diff between two commits.
 * Used in githubPush.ts to understand exactly what changed
 * before passing context to Sentinel and Fortress.
 *
 * @example
 * const diff = await repoOps.fetchDiff({
 *   repoFullName: "owner/velocis",
 *   baseSha: webhookEvent.before,
 *   headSha: webhookEvent.after,
 *   token: installationToken,
 * });
 */
async function fetchDiff(params: FetchDiffParams): Promise<FetchDiffResult> {
  const { repoFullName, baseSha, headSha, token } = params;
  const [owner, repo] = splitRepoFullName(repoFullName);
  const octokit = buildOctokit(token);

  try {
    logger.info({
      msg: "repoOps.fetchDiff",
      repoFullName,
      baseSha: baseSha.substring(0, 8),
      headSha: headSha.substring(0, 8),
    });

    const { data } = await octokit.repos.compareCommitsWithBasehead({
      owner,
      repo,
      basehead: `${baseSha}...${headSha}`,
    });

    const files: FileDiff[] = (data.files ?? []).map((f) => ({
      filename: f.filename,
      status: f.status as FileDiff["status"],
      additions: f.additions,
      deletions: f.deletions,
      changes: f.changes,
      patch: f.patch,
      previousFilename: f.previous_filename,
    }));

    logger.info({
      msg: "repoOps.fetchDiff: complete",
      repoFullName,
      filesChanged: files.length,
      totalAdditions: data.total_commits,
    });

    return {
      files,
      totalAdditions: files.reduce((sum, f) => sum + f.additions, 0),
      totalDeletions: files.reduce((sum, f) => sum + f.deletions, 0),
      aheadBy: data.ahead_by,
      behindBy: data.behind_by,
      status: data.status,
    };
  } catch (err) {
    logger.error({
      msg: "repoOps.fetchDiff: failed",
      repoFullName,
      error: String(err),
    });
    throw new RepoOpsError("fetchDiff", repoFullName, err);
  }
}

// ─────────────────────────────────────────────
// REPO TREE — Full file tree for Cortex graphBuilder
// ─────────────────────────────────────────────

/**
 * Fetches the entire file tree of a repository.
 * Powers graphBuilder.ts to build the 3D Cortex node/edge graph.
 * Uses recursive=true to get the full tree in one API call.
 *
 * @example
 * const tree = await repoOps.fetchRepoTree({
 *   repoFullName: "owner/velocis",
 *   token: installationToken,
 *   recursive: true,
 * });
 */
async function fetchRepoTree(
  params: FetchRepoTreeParams
): Promise<RepoTreeItem[]> {
  const { repoFullName, token, ref = "HEAD", recursive = true } = params;
  const [owner, repo] = splitRepoFullName(repoFullName);
  const octokit = buildOctokit(token);

  try {
    logger.info({
      msg: "repoOps.fetchRepoTree",
      repoFullName,
      ref,
      recursive,
    });

    const { data } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: ref,
      recursive: recursive ? "1" : undefined,
    });

    if (data.truncated) {
      logger.warn({
        msg: "repoOps.fetchRepoTree: tree was truncated — repo may be too large",
        repoFullName,
      });
    }

    const items: RepoTreeItem[] = (data.tree ?? [])
      .filter((item) => item.path && item.type && item.sha)
      .map((item) => ({
        path: item.path!,
        type: item.type as "blob" | "tree",
        sha: item.sha!,
        size: item.size,
        url: item.url!,
      }));

    logger.info({
      msg: "repoOps.fetchRepoTree: complete",
      repoFullName,
      itemCount: items.length,
      truncated: data.truncated,
    });

    return items;
  } catch (err) {
    logger.error({
      msg: "repoOps.fetchRepoTree: failed",
      repoFullName,
      error: String(err),
    });
    throw new RepoOpsError("fetchRepoTree", repoFullName, err);
  }
}

// ─────────────────────────────────────────────
// REPO LISTING — For /onboarding page
// ─────────────────────────────────────────────

/**
 * Lists all repositories accessible to a user.
 * Used on the /onboarding page to show the repo selection list.
 * Paginates automatically if the user has many repos.
 *
 * @example
 * const repos = await repoOps.listUserRepos({
 *   token: userOAuthToken,
 *   sort: "pushed",
 *   visibility: "all",
 * });
 */
async function listUserRepos(
  params: ListReposParams
): Promise<GitHubRepoSummary[]> {
  const {
    token,
    page = 1,
    perPage = 50,
    sort = "pushed",
    visibility = "all",
  } = params;

  const octokit = buildOctokit(token);

  try {
    logger.info({
      msg: "repoOps.listUserRepos",
      page,
      perPage,
      sort,
      visibility,
    });

    const { data } = await octokit.repos.listForAuthenticatedUser({
      sort,
      visibility,
      per_page: perPage,
      page,
      affiliation: "owner,collaborator,organization_member",
    });

    const repos: GitHubRepoSummary[] = data.map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      private: r.private,
      description: r.description ?? null,
      defaultBranch: r.default_branch,
      language: r.language ?? null,
      visibility: r.visibility ?? "private",
      htmlUrl: r.html_url,
      updatedAt: r.updated_at ?? null,
      pushedAt: r.pushed_at ?? null,
      size: r.size,
      openIssuesCount: r.open_issues_count,
      stargazersCount: r.stargazers_count,
    }));

    logger.info({
      msg: "repoOps.listUserRepos: complete",
      count: repos.length,
    });

    return repos;
  } catch (err) {
    logger.error({
      msg: "repoOps.listUserRepos: failed",
      error: String(err),
    });
    throw new RepoOpsError("listUserRepos", "authenticated user", err);
  }
}

// ─────────────────────────────────────────────
// CHECK RUNS — Fortress TDD results → GitHub UI
// ─────────────────────────────────────────────

/**
 * Creates a GitHub Check Run for Fortress's TDD pipeline.
 * This is what makes the green/red check marks appear on commits in GitHub.
 * Call with status "queued" when Fortress starts, "completed" when done.
 *
 * @example
 * // Start check
 * const { checkRunId } = await repoOps.createCheckRun({
 *   repoFullName: "owner/velocis",
 *   name: "Fortress TDD",
 *   headSha: commitSha,
 *   status: "in_progress",
 *   title: "Running self-healing test suite...",
 *   summary: "Fortress is analyzing your code",
 *   token: installationToken,
 * });
 */
async function createCheckRun(
  params: CreateCheckRunParams
): Promise<{ checkRunId: number }> {
  const {
    repoFullName,
    name,
    headSha,
    status,
    conclusion,
    title,
    summary,
    annotations = [],
    token,
  } = params;

  const [owner, repo] = splitRepoFullName(repoFullName);
  const octokit = buildOctokit(token);

  try {
    logger.info({
      msg: "repoOps.createCheckRun",
      repoFullName,
      name,
      status,
      conclusion,
    });

    const { data } = await octokit.checks.create({
      owner,
      repo,
      name,
      head_sha: headSha,
      status,
      ...(conclusion && { conclusion }),
      ...(status === "completed" && { completed_at: new Date().toISOString() }),
      started_at: new Date().toISOString(),
      output: {
        title,
        summary,
        ...(annotations.length > 0 && {
          annotations: annotations.map((a) => ({
            path: a.path,
            start_line: a.startLine,
            end_line: a.endLine,
            annotation_level: a.annotationLevel,
            message: a.message,
            title: a.title,
            raw_details: a.rawDetails,
          })),
        }),
      },
    });

    logger.info({
      msg: "repoOps.createCheckRun: success",
      repoFullName,
      checkRunId: data.id,
    });

    return { checkRunId: data.id };
  } catch (err) {
    logger.error({
      msg: "repoOps.createCheckRun: failed",
      repoFullName,
      error: String(err),
    });
    throw new RepoOpsError("createCheckRun", repoFullName, err);
  }
}

/**
 * Updates an existing Check Run with new status/conclusion.
 * Called when Fortress completes — updates "in_progress" → "completed".
 */
async function updateCheckRun(params: UpdateCheckRunParams): Promise<void> {
  const {
    repoFullName,
    checkRunId,
    status,
    conclusion,
    title,
    summary,
    annotations = [],
    token,
  } = params;

  const [owner, repo] = splitRepoFullName(repoFullName);
  const octokit = buildOctokit(token);

  try {
    await octokit.checks.update({
      owner,
      repo,
      check_run_id: checkRunId,
      status,
      ...(conclusion && { conclusion }),
      ...(status === "completed" && { completed_at: new Date().toISOString() }),
      output: {
        title,
        summary,
        ...(annotations.length > 0 && {
          annotations: annotations.map((a) => ({
            path: a.path,
            start_line: a.startLine,
            end_line: a.endLine,
            annotation_level: a.annotationLevel,
            message: a.message,
          })),
        }),
      },
    });

    logger.info({
      msg: "repoOps.updateCheckRun: success",
      repoFullName,
      checkRunId,
      status,
      conclusion,
    });
  } catch (err) {
    logger.error({
      msg: "repoOps.updateCheckRun: failed",
      repoFullName,
      checkRunId,
      error: String(err),
    });
    throw new RepoOpsError("updateCheckRun", repoFullName, err);
  }
}

// ─────────────────────────────────────────────
// INSTALLATION TOKEN PASSTHROUGH
// Exposed so githubPush.ts can call repoOps.getInstallationToken
// without importing auth.ts directly
// ─────────────────────────────────────────────

export { getInstallationToken };

// ─────────────────────────────────────────────
// EXPORTED CLIENT OBJECT
// ─────────────────────────────────────────────

export const repoOps = {
  fetchFileContents,
  pushFile,
  pushMultipleFiles,
  createBranch,
  branchExists,
  createPR,
  pushPRComment,
  pushInlinePRComment,
  fetchDiff,
  fetchRepoTree,
  listUserRepos,
  createCheckRun,
  updateCheckRun,
  getInstallationToken,
};

// ─────────────────────────────────────────────
// INTERNAL UTILITIES
// ─────────────────────────────────────────────

/**
 * Splits "owner/repo" into [owner, repo].
 * Throws clearly if the format is wrong rather than producing
 * a cryptic "owner is undefined" GitHub API error.
 */
function splitRepoFullName(fullName: string): [string, string] {
  const parts = fullName.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new RepoOpsError(
      "splitRepoFullName",
      fullName,
      new Error(`Invalid repoFullName format: '${fullName}' — expected 'owner/repo'`)
    );
  }
  return [parts[0], parts[1]];
}

/**
 * Splits an array into chunks of a given size.
 */
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ─────────────────────────────────────────────
// CUSTOM ERROR
// ─────────────────────────────────────────────

export class RepoOpsError extends Error {
  constructor(operation: string, repoFullName: string, cause: unknown) {
    const message =
      cause instanceof Error ? cause.message : String(cause);
    super(`repoOps.${operation} failed for '${repoFullName}': ${message}`);
    this.name = "RepoOpsError";
    this.cause = cause;
  }
}