// src/models/interfaces/Repository.ts

/**
 * Represents the supported regional languages for Sentinel's Mentorship Hub.
 * Must stay in sync with SupportedLanguage in analyzeLogic.ts and mentorChat.ts.
 */
export type MentorshipLanguage = 'en' | 'hi' | 'ta' | 'te' | 'kn' | 'mr' | 'bn';

/**
 * Tracks the autonomous health and execution status of the Fortress TDD Engine.
 */
export interface FortressStatus {
  isActive: boolean;
  totalTestsGenerated: number;
  totalSelfHeals: number;
  lastExecutionStatus: 'SUCCESS' | 'HEALING' | 'FAILED' | 'IDLE';
  lastExecutionTimestamp?: string;
}

/**
 * Tracks Sentinel's code review metrics and active mentorship sessions.
 */
export interface SentinelStatus {
  isActive: boolean;
  totalReviewsCompleted: number;
  mentorshipLanguage: MentorshipLanguage; // e.g., 'hi' for Hindi translations
  lastReviewTimestamp?: string;
}

/**
 * Tracks the vectorization and 3D mapping state for the Visual Cortex canvas.
 */
export interface CortexStatus {
  isMapped: boolean;
  totalNodes: number;
  totalEdges: number;
  lastVectorizedTimestamp?: string;
}

/**
 * Tracks the AWS serverless cost projections from the IaC Predictor.
 */
export interface IacPredictorStatus {
  projectedMonthlyCostUSD: number;
  lastForecastTimestamp?: string;
}

/**
 * The core Repository interface representing a connected codebase in DynamoDB.
 */
export interface Repository {
  // --- Primary Keys (DynamoDB) ---
  id: string;                  // e.g., "repo_123456" (Partition Key)
  ownerId: string;             // e.g., "usr_789" (Global Secondary Index for user lookups)

  // --- GitHub / GitLab Metadata ---
  githubRepoId: number;        // The actual ID from GitHub
  name: string;                // e.g., "InfraZero"
  fullName: string;            // e.g., "username/InfraZero"
  url: string;                 // The HTTPS clone URL or browser URL
  defaultBranch: string;       // e.g., "main"
  primaryLanguage: string;     // e.g., "TypeScript", "Python"
  installationId: number;      // Required to authenticate GitHub App Webhooks
  
  // --- Tri-Agent System State ---
  agents: {
    sentinel: SentinelStatus;
    fortress: FortressStatus;
    cortex: CortexStatus;
  };

  // --- IaC Predictor State ---
  infrastructure: IacPredictorStatus;

  // --- Timestamps ---
  createdAt: string;           // ISO 8601 Timestamp
  updatedAt: string;           // ISO 8601 Timestamp

  // --- Operational / Push Webhook Fields ---
  // Set on each processed GitHub push event (githubPush.ts)
  repoId?: string;             // DynamoDB convenience alias for id
  repoFullName?: string;       // DynamoDB convenience alias for fullName
  lastPushAt?: string;         // ISO 8601 — timestamp of the last processed push
  lastPushedBy?: string;       // GitHub login of the pusher
  lastCommitSha?: string;      // SHA of the most recent processed commit
  status?: 'idle' | 'processing' | 'healthy' | 'degraded'; // Agent pipeline state
}