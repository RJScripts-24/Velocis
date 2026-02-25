// src/models/schemas/githubSchemas.ts
// Strict Zod schemas for all incoming GitHub webhook payloads
// These are the single source of truth for what Velocis accepts from GitHub
// Every field is explicitly typed — no "unknown" sneaking through

import { z } from "zod";

// ─────────────────────────────────────────────
// PRIMITIVES & REUSABLE SUB-SCHEMAS
// These are building blocks used across multiple event schemas
// ─────────────────────────────────────────────

/**
 * GitHub user object — appears as sender, owner, pusher etc.
 */
const GitHubUserSchema = z.object({
  id: z.number().int().positive(),
  login: z.string().min(1),
  avatar_url: z.string().url(),
  html_url: z.string().url(),
  type: z.enum(["User", "Bot", "Organization"]),
  site_admin: z.boolean(),
});

/**
 * GitHub repository owner — either a User or an Organization
 */
const RepositoryOwnerSchema = z.object({
  id: z.number().int().positive(),
  login: z.string().min(1),
  avatar_url: z.string().url(),
  type: z.enum(["User", "Organization"]),
});

/**
 * Core repository object — embedded in almost every GitHub event
 */
const GitHubRepositorySchema = z.object({
  id: z.number().int().positive(),
  node_id: z.string().min(1),
  name: z.string().min(1),
  full_name: z.string().regex(
    /^[\w.-]+\/[\w.-]+$/,
    "full_name must be in 'owner/repo' format"
  ),
  private: z.boolean(),
  owner: RepositoryOwnerSchema,
  html_url: z.string().url(),
  description: z.string().nullable(),
  fork: z.boolean(),
  url: z.string().url(),
  default_branch: z.string().min(1),
  language: z.string().nullable(),
  visibility: z.enum(["public", "private", "internal"]),
  size: z.number().int().nonnegative(),
  stargazers_count: z.number().int().nonnegative(),
  open_issues_count: z.number().int().nonnegative(),
  created_at: z.number().int().positive(), // Unix timestamp in push events
  updated_at: z.string().datetime(),
  pushed_at: z.number().int().positive(),  // Unix timestamp in push events
});

/**
 * A single commit object within a push event
 */
const GitHubCommitSchema = z.object({
  id: z.string().min(1),         // Full SHA
  tree_id: z.string().min(1),
  distinct: z.boolean(),          // Whether this commit is new to this branch
  message: z.string().min(1),
  timestamp: z.string().datetime(),
  url: z.string().url(),
  author: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    username: z.string().optional(), // Not always present
  }),
  committer: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    username: z.string().optional(),
  }),
  added: z.array(z.string()),     // Files added in this commit
  removed: z.array(z.string()),   // Files deleted in this commit
  modified: z.array(z.string()),  // Files changed in this commit
});

/**
 * GitHub App installation reference — present when Velocis is installed as a GitHub App
 */
const InstallationSchema = z.object({
  id: z.number().int().positive(),
  node_id: z.string().min(1),
});

/**
 * Head commit — the latest commit in a push, always present unless branch deleted
 */
const HeadCommitSchema = GitHubCommitSchema.extend({
  // head_commit can have slightly different shape, extend base
});

/**
 * Pusher — the git identity of whoever ran `git push` (not always the same as sender)
 */
const PusherSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(), // GitHub doesn't always include this
});

// ─────────────────────────────────────────────
// CORE EVENT: PUSH
// Fired when commits are pushed to any branch
// This is the primary trigger for the Velocis Tri-Agent pipeline
// ─────────────────────────────────────────────

export const githubPushSchema = z.object({
  // The full git ref that was pushed to e.g. "refs/heads/main"
  ref: z.string().regex(
    /^refs\/(heads|tags)\/.+$/,
    "ref must be a valid git ref like 'refs/heads/main'"
  ),

  // SHA of the commit BEFORE this push (all zeros = new branch)
  before: z.string().regex(/^[0-9a-f]{40}$/, "before must be a 40-char SHA"),

  // SHA of the HEAD commit AFTER this push
  after: z.string().regex(/^[0-9a-f]{40}$/, "after must be a 40-char SHA"),

  // Whether this push created a new branch
  created: z.boolean(),

  // Whether this push deleted a branch (if true, commits array will be empty)
  deleted: z.boolean(),

  // Whether this is a force push
  forced: z.boolean(),

  base_ref: z.string().nullable(),

  compare: z.string().url(),

  // All commits included in this push (up to 20; GitHub truncates beyond that)
  commits: z.array(GitHubCommitSchema).max(
    20,
    "GitHub sends max 20 commits per push event"
  ),

  // The most recent commit — null if branch was deleted
  head_commit: HeadCommitSchema.nullable(),

  repository: GitHubRepositorySchema,

  pusher: PusherSchema,

  // The authenticated GitHub user who triggered the push via the API/UI
  sender: GitHubUserSchema,

  // Present only when Velocis is installed as a GitHub App (not OAuth app)
  installation: InstallationSchema.optional(),

  // Present for organization repositories
  organization: z
    .object({
      id: z.number().int().positive(),
      login: z.string().min(1),
      avatar_url: z.string().url(),
    })
    .optional(),
});

// ─────────────────────────────────────────────
// EVENT: PULL REQUEST
// Fired when a PR is opened, closed, updated, merged
// Sentinel uses this for PR-level architectural reviews
// ─────────────────────────────────────────────

const GitHubBranchRefSchema = z.object({
  label: z.string(),           // e.g. "owner:feature-branch"
  ref: z.string(),             // e.g. "feature-branch"
  sha: z.string().regex(/^[0-9a-f]{40}$/),
  user: GitHubUserSchema,
  repo: GitHubRepositorySchema,
});

export const githubPullRequestSchema = z.object({
  action: z.enum([
    "opened",
    "closed",
    "reopened",
    "synchronize",   // New commits pushed to the PR branch
    "edited",
    "labeled",
    "unlabeled",
    "assigned",
    "unassigned",
    "review_requested",
    "review_request_removed",
    "ready_for_review",
    "converted_to_draft",
    "locked",
    "unlocked",
    "auto_merge_enabled",
    "auto_merge_disabled",
  ]),

  number: z.number().int().positive(),

  pull_request: z.object({
    id: z.number().int().positive(),
    node_id: z.string(),
    number: z.number().int().positive(),
    title: z.string().min(1),
    state: z.enum(["open", "closed"]),
    locked: z.boolean(),
    draft: z.boolean(),
    merged: z.boolean(),
    mergeable: z.boolean().nullable(),
    html_url: z.string().url(),
    diff_url: z.string().url(),
    patch_url: z.string().url(),
    body: z.string().nullable(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    closed_at: z.string().datetime().nullable(),
    merged_at: z.string().datetime().nullable(),
    head: GitHubBranchRefSchema,
    base: GitHubBranchRefSchema,
    user: GitHubUserSchema,
    additions: z.number().int().nonnegative(),
    deletions: z.number().int().nonnegative(),
    changed_files: z.number().int().nonnegative(),
    commits: z.number().int().nonnegative(),
  }),

  repository: GitHubRepositorySchema,
  sender: GitHubUserSchema,
  installation: InstallationSchema.optional(),
});

// ─────────────────────────────────────────────
// EVENT: INSTALLATION
// Fired when Velocis GitHub App is installed/uninstalled on a repo
// Used in /onboarding to trigger webhook setup
// ─────────────────────────────────────────────

export const githubInstallationSchema = z.object({
  action: z.enum([
    "created",          // App installed
    "deleted",          // App uninstalled
    "suspend",          // App suspended by org admin
    "unsuspend",
    "new_permissions_accepted",
  ]),

  installation: z.object({
    id: z.number().int().positive(),
    app_id: z.number().int().positive(),
    app_slug: z.string(),
    account: z.union([
      GitHubUserSchema,
      z.object({
        id: z.number().int().positive(),
        login: z.string(),
        type: z.literal("Organization"),
        avatar_url: z.string().url(),
      }),
    ]),
    access_tokens_url: z.string().url(),
    repositories_url: z.string().url(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    suspended_at: z.string().datetime().nullable(),
  }),

  // Repositories that were added to the installation
  repositories_added: z
    .array(
      z.object({
        id: z.number().int().positive(),
        node_id: z.string(),
        name: z.string(),
        full_name: z.string(),
        private: z.boolean(),
      })
    )
    .optional(),

  // Repositories removed from the installation
  repositories_removed: z
    .array(
      z.object({
        id: z.number().int().positive(),
        node_id: z.string(),
        name: z.string(),
        full_name: z.string(),
        private: z.boolean(),
      })
    )
    .optional(),

  sender: GitHubUserSchema,
});

// ─────────────────────────────────────────────
// EVENT: CHECK RUN
// Fired when Fortress's test results post back as GitHub Check Runs
// Allows the 3D Cortex to update node health in real-time
// ─────────────────────────────────────────────

export const githubCheckRunSchema = z.object({
  action: z.enum(["created", "completed", "rerequested", "requested_action"]),

  check_run: z.object({
    id: z.number().int().positive(),
    name: z.string(),
    head_sha: z.string().regex(/^[0-9a-f]{40}$/),
    status: z.enum(["queued", "in_progress", "completed"]),
    conclusion: z
      .enum([
        "success",
        "failure",
        "neutral",
        "cancelled",
        "skipped",
        "timed_out",
        "action_required",
      ])
      .nullable(),
    started_at: z.string().datetime().nullable(),
    completed_at: z.string().datetime().nullable(),
    html_url: z.string().url(),
    output: z.object({
      title: z.string().nullable(),
      summary: z.string().nullable(),
      text: z.string().nullable(),
      annotations_count: z.number().int().nonnegative(),
    }),
  }),

  repository: GitHubRepositorySchema,
  sender: GitHubUserSchema,
  installation: InstallationSchema.optional(),
});

// ─────────────────────────────────────────────
// DISCRIMINATED UNION: Any GitHub Event
// Use this when the event type isn't known upfront
// (e.g., in a shared webhook router)
// ─────────────────────────────────────────────

export const anyGitHubEventSchema = z.discriminatedUnion("event_type", [
  githubPushSchema.extend({ event_type: z.literal("push") }),
  githubPullRequestSchema.extend({ event_type: z.literal("pull_request") }),
  githubInstallationSchema.extend({ event_type: z.literal("installation") }),
  githubCheckRunSchema.extend({ event_type: z.literal("check_run") }),
]);

// ─────────────────────────────────────────────
// INFERRED TYPESCRIPT TYPES
// Derive types directly from schemas — never duplicate type definitions
// ─────────────────────────────────────────────

export type GitHubUser = z.infer<typeof GitHubUserSchema>;
export type GitHubRepository = z.infer<typeof GitHubRepositorySchema>;
export type GitHubCommit = z.infer<typeof GitHubCommitSchema>;
export type GitHubInstallation = z.infer<typeof InstallationSchema>;
export type GitHubBranchRef = z.infer<typeof GitHubBranchRefSchema>;

export type GithubPushEvent = z.infer<typeof githubPushSchema>;
export type GithubPullRequestEvent = z.infer<typeof githubPullRequestSchema>;
export type GithubInstallationEvent = z.infer<typeof githubInstallationSchema>;
export type GithubCheckRunEvent = z.infer<typeof githubCheckRunSchema>;
export type AnyGitHubEvent = z.infer<typeof anyGitHubEventSchema>;