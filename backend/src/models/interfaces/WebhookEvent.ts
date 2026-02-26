// src/models/interfaces/WebhookEvent.ts

/**
 * The essential headers sent by GitHub. 
 * Used by your verifySignature middleware to validate the payload's authenticity.
 */
export interface GitHubWebhookHeaders {
  'x-github-event': 'push' | 'pull_request' | 'installation';
  'x-hub-signature-256': string;
  'x-github-delivery': string;
}

/**
 * Basic GitHub User information (the developer who triggered the event).
 */
export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  type: 'User' | 'Bot';
}

/**
 * Lightweight repository data included in the webhook payload.
 */
export interface WebhookRepository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  owner: GitHubUser;
  html_url: string;
  default_branch: string;
}

/**
 * Represents a single commit in a Push Event.
 * Sentinel uses the added, removed, and modified arrays to fetch 
 * only the changed code for Claude 3.5 to analyze, saving API costs.
 */
export interface GitHubCommit {
  id: string;
  tree_id: string;
  message: string;
  timestamp: string;
  author: {
    name: string;
    email: string;
    username: string;
  };
  added: string[];    // File paths added
  removed: string[];  // File paths removed
  modified: string[]; // File paths modified
}

/**
 * The payload for a GitHub 'push' event.
 * TRIGGER: This fires Fortress's AWS Step Functions TDD loop and Visual Cortex's mapping.
 */
export interface PushEventPayload {
  ref: string;          // e.g., "refs/heads/main"
  before: string;       // Previous commit SHA
  after: string;        // New commit SHA
  repository: WebhookRepository;
  pusher: {
    name: string;
    email: string;
  };
  sender: GitHubUser;
  installation?: {
    id: number;         // Crucial for generating auth tokens to push fixes back
  };
  commits: GitHubCommit[];
  head_commit: GitHubCommit;
}

/**
 * The payload for a GitHub 'pull_request' event.
 * TRIGGER: This fires Sentinel's deep-logic code review and IaC Predictor's cost forecast.
 */
export interface PullRequestEventPayload {
  action: 'opened' | 'synchronize' | 'reopened' | 'closed';
  number: number;       // The PR number
  pull_request: {
    url: string;
    id: number;
    state: 'open' | 'closed';
    title: string;
    body: string;
    head: {
      ref: string;      // Branch name (e.g., "feature/new-api")
      sha: string;
    };
    base: {
      ref: string;      // Target branch (e.g., "main")
      sha: string;
    };
  };
  repository: WebhookRepository;
  sender: GitHubUser;
  installation?: {
    id: number;
  };
}

/**
 * A discriminated union type representing the parsed and validated webhook event 
 * passed down from API Gateway to your specific Lambda handler.
 */
export type ParsedWebhookEvent = 
  | { eventType: 'push'; payload: PushEventPayload }
  | { eventType: 'pull_request'; payload: PullRequestEventPayload };