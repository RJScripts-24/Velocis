# Velocis — Backend API Contract

> **Version:** 1.0.0  
> **Date:** 2026-03-02  
> **Base URL:** `https://api.velocis.dev/v1`  
> **Auth:** All protected endpoints require `Authorization: Bearer <access_token>` header (JWT issued after GitHub OAuth).

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [User](#2-user)
3. [GitHub Repositories](#3-github-repositories)
4. [Onboarding / Installation](#4-onboarding--installation)
5. [Dashboard](#5-dashboard)
6. [Repository Overview](#6-repository-overview)
7. [Sentinel Agent (Code Review)](#7-sentinel-agent-code-review)
8. [Fortress Agent (QA Pipeline)](#8-fortress-agent-qa-pipeline)
9. [Cortex Agent (Service Map)](#9-cortex-agent-service-map)
10. [Workspace (AI Chat & Annotations)](#10-workspace-ai-chat--annotations)
11. [Infrastructure](#11-infrastructure)
12. [Activity Feed](#12-activity-feed)
13. [System Health](#13-system-health)
14. [Shared Types / Enums](#14-shared-types--enums)
15. [Error Format](#15-error-format)
16. [Webhook Events (GitHub → Backend)](#16-webhook-events-github--backend)

---

## 1. Authentication

All auth flows use **GitHub OAuth 2.0**. The frontend never handles passwords.

---

### `GET /auth/github`
Redirects the user to GitHub's OAuth consent screen.

**Query Params:** none  
**Response:** `302 Redirect → https://github.com/login/oauth/authorize?...`

---

### `GET /auth/github/callback`
GitHub redirects here after user authorizes. Backend exchanges the code for tokens and redirects the frontend.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `code` | `string` | GitHub OAuth code |
| `state` | `string` | CSRF state |

**On success:** `302 Redirect → /onboarding` with a session cookie or redirect to frontend with token in query/fragment.

**Response body (if not redirect):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": {
    "id": "usr_01HXYZ",
    "github_id": 12345678,
    "login": "rishi",
    "name": "Rishi Kumar",
    "email": "rishi@example.com",
    "avatar_url": "https://avatars.githubusercontent.com/u/12345678"
  }
}
```

---

### `POST /auth/logout`
Invalidates the user session / JWT.

**Auth:** Required  
**Response:** `204 No Content`

---

## 2. User

### `GET /me`
Returns the currently authenticated user.

**Auth:** Required

**Response `200`:**
```json
{
  "id": "usr_01HXYZ",
  "github_id": 12345678,
  "login": "rishi",
  "name": "Rishi Kumar",
  "email": "rishi@example.com",
  "avatar_url": "https://avatars.githubusercontent.com/u/12345678",
  "created_at": "2025-01-15T10:00:00Z"
}
```

---

## 3. GitHub Repositories

These endpoints proxy to GitHub API using the user's OAuth token to list repos they have access to.

### `GET /github/repos`
Returns all GitHub repositories accessible to the user (for the repo selection / onboarding screen).

**Auth:** Required  
**Query Params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `q` | `string` | — | Search/filter by repo name |
| `page` | `number` | `1` | Pagination |
| `per_page` | `number` | `20` | Results per page |

**Response `200`:**
```json
{
  "repos": [
    {
      "github_id": 987654321,
      "name": "InfraZero",
      "full_name": "rishi/InfraZero",
      "visibility": "private",
      "language": "TypeScript",
      "language_color": "#3178c6",
      "updated_at": "2026-02-28T10:00:00Z",
      "velocis_installed": false
    },
    {
      "github_id": 111222333,
      "name": "Immersa",
      "full_name": "rishi/Immersa",
      "visibility": "private",
      "language": "Python",
      "language_color": "#3572A5",
      "updated_at": "2026-03-01T22:00:00Z",
      "velocis_installed": true
    }
  ],
  "total": 12,
  "page": 1,
  "per_page": 20
}
```

---

## 4. Onboarding / Installation

### `POST /repos/:repoId/install`
Installs Velocis on a GitHub repository. This triggers:
1. GitHub webhook registration
2. Sentinel initialization
3. Fortress QA loop provisioning
4. Cortex (Visual) activation

**Auth:** Required  
**Path param:** `repoId` — GitHub repo ID (numeric)

**Request body:** none required; repo info is resolved server-side via OAuth token.

**Response `202 Accepted`** (async job):
```json
{
  "job_id": "job_01INSTALL_XYZ",
  "status": "queued",
  "steps": [
    { "id": "webhook",  "label": "Registering GitHub webhook",         "status": "queued" },
    { "id": "sentinel", "label": "Initializing Sentinel",              "status": "queued" },
    { "id": "fortress", "label": "Provisioning Fortress QA loop",      "status": "queued" },
    { "id": "cortex",   "label": "Activating Visual Cortex",           "status": "queued" }
  ]
}
```

---

### `GET /repos/:repoId/install/status`
Poll to check the installation progress (frontend uses this to animate the step-by-step install screen).

**Auth:** Required

**Response `200`:**
```json
{
  "job_id": "job_01INSTALL_XYZ",
  "overall_status": "in_progress",
  "steps": [
    { "id": "webhook",  "label": "Registering GitHub webhook",         "status": "complete" },
    { "id": "sentinel", "label": "Initializing Sentinel",              "status": "complete" },
    { "id": "fortress", "label": "Provisioning Fortress QA loop",      "status": "in_progress" },
    { "id": "cortex",   "label": "Activating Visual Cortex",           "status": "queued" }
  ],
  "repo_slug": "infrazero"
}
```

`overall_status`: `queued` | `in_progress` | `complete` | `failed`  
`step.status`: `queued` | `in_progress` | `complete` | `failed`

---

## 5. Dashboard

### `GET /dashboard`
Returns the full organization-level dashboard data — all installed repos summary, counts, activity feed, and system metrics.

**Auth:** Required  
**Query Params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `range` | `string` | `24h` | Time window: `1h` \| `24h` \| `7d` \| `30d` |

**Response `200`:**
```json
{
  "user": {
    "name": "Rishi",
    "avatar_url": "https://avatars.githubusercontent.com/u/12345678"
  },
  "summary": {
    "healthy": 4,
    "warning": 1,
    "critical": 1,
    "open_risks": 3,
    "agents_running": 3
  },
  "repos": [
    {
      "id": "infrazero",
      "name": "infrazero",
      "status": "critical",
      "language": "TypeScript",
      "last_activity": [
        {
          "agent": "sentinel",
          "message": "race condition flagged in writer.go",
          "severity": "critical",
          "timestamp_ago": "12m"
        },
        {
          "agent": "fortress",
          "message": "247/247 tests passing",
          "severity": "healthy",
          "timestamp_ago": "1h"
        }
      ],
      "commit_sparkline": [8,6,9,7,10,8,12,9,7,6,8,5,4,3],
      "commit_trend_label": "↓ 38%",
      "commit_trend_direction": "down"
    },
    {
      "id": "immersa",
      "name": "immersa",
      "status": "warning",
      "language": "Python",
      "last_activity": [
        {
          "agent": "sentinel",
          "message": "PR #214 clean, merged",
          "severity": "healthy",
          "timestamp_ago": "2h"
        },
        {
          "agent": "fortress",
          "message": "8 flaky tests quarantined",
          "severity": "warning",
          "timestamp_ago": "29m"
        }
      ],
      "commit_sparkline": [5,6,8,7,9,11,9,10,8,9,10,9,8,10],
      "commit_trend_label": "~ volatile",
      "commit_trend_direction": "volatile"
    }
  ],
  "activity_feed": [
    {
      "id": "evt_001",
      "agent": "sentinel",
      "repo_id": "infrazero",
      "repo_name": "InfraZero",
      "message": "Flagged potential race condition",
      "severity": "critical",
      "timestamp_ago": "12m",
      "timestamp": "2026-03-02T10:48:00Z"
    },
    {
      "id": "evt_002",
      "agent": "fortress",
      "repo_id": "immersa",
      "repo_name": "Immersa",
      "message": "3 flaky tests auto-quarantined",
      "severity": "warning",
      "timestamp_ago": "29m",
      "timestamp": "2026-03-02T10:31:00Z"
    },
    {
      "id": "evt_003",
      "agent": "cortex",
      "repo_id": "infrazero",
      "repo_name": "InfraZero",
      "message": "Service map updated — 2 new nodes",
      "severity": "info",
      "timestamp_ago": "58s",
      "timestamp": "2026-03-02T10:59:02Z"
    }
  ],
  "recent_deployments": [
    { "repo_id": "infrazero", "environment": "prod",    "deployed_at": "2026-03-02T10:46:00Z", "status": "failed"  },
    { "repo_id": "nexlayer",  "environment": "prod",    "deployed_at": "2026-03-02T08:00:00Z", "status": "success" },
    { "repo_id": "immersa",   "environment": "staging", "deployed_at": "2026-03-02T07:00:00Z", "status": "success" }
  ],
  "system": {
    "api_latency_ms": 38,
    "queue_depth": 12,
    "agent_uptime_pct": 99.7,
    "storage_used_pct": 61
  }
}
```

---

## 6. Repository Overview

### `GET /repos/:repoId`
Returns full detail for a single installed repository.

**Auth:** Required  
**Path param:** `repoId` — slug (e.g., `infrazero`)

**Response `200`:**
```json
{
  "id": "infrazero",
  "name": "InfraZero",
  "status": "healthy",
  "status_label": "System Healthy",
  "visibility": "private",
  "language": "TypeScript",
  "last_scanned_ago": "3 min ago",
  "last_scanned_at": "2026-03-02T10:57:00Z",
  "size_loc": "2.4M LOC",
  "metrics": {
    "risk_score": "Low",
    "test_stability_pct": 100,
    "architecture_drift": "None detected",
    "last_action_ago": "2 minutes ago"
  },
  "sentinel": {
    "active_prs": 2,
    "last_update_ago": "5 minutes ago"
  },
  "fortress": {
    "status_message": "All pipelines passing",
    "last_run_ago": "10 minutes ago"
  },
  "cortex": {
    "last_update_ago": "2 minutes ago",
    "service_count": 42
  },
  "risks": {
    "critical": 0,
    "medium": 2,
    "low": 5
  }
}
```

`status`: `healthy` | `warning` | `critical`

---

## 7. Sentinel Agent (Code Review)

### `GET /repos/:repoId/sentinel/prs`
Returns all open (and recently closed) pull requests with their Sentinel risk analysis.

**Auth:** Required

**Response `200`:**
```json
{
  "prs": [
    {
      "pr_number": 482,
      "title": "Add payment retry logic",
      "author": "dev-user",
      "branch": "feat/payment-retry",
      "risk_score": 91,
      "risk_level": "critical",
      "state": "open",
      "created_at": "2026-03-01T14:00:00Z",
      "findings": [
        {
          "id": "finding_001",
          "severity": "critical",
          "file": "src/payments/retry.ts",
          "line": 47,
          "message": "Potential infinite retry loop without backoff"
        }
      ]
    },
    {
      "pr_number": 479,
      "title": "Refactor auth middleware",
      "author": "dev-user",
      "branch": "refactor/auth",
      "risk_score": 62,
      "risk_level": "warning",
      "state": "open",
      "created_at": "2026-03-01T11:00:00Z",
      "findings": []
    }
  ]
}
```

`risk_level`: `low` | `warning` | `critical`

---

### `GET /repos/:repoId/sentinel/prs/:prNumber`
Returns in-depth analysis for a specific pull request.

**Auth:** Required

**Response `200`:**
```json
{
  "pr_number": 482,
  "title": "Add payment retry logic",
  "risk_score": 91,
  "risk_level": "critical",
  "summary": "High-risk PR. Contains potential infinite retry loop and missing rate limiting.",
  "findings": [
    {
      "id": "finding_001",
      "severity": "critical",
      "file": "src/payments/retry.ts",
      "line": 47,
      "message": "Potential infinite retry loop without backoff",
      "suggestion": "Add exponential backoff with a max retry count of 5"
    }
  ],
  "diff_url": "https://github.com/org/repo/pull/482"
}
```

---

### `POST /repos/:repoId/sentinel/scan`
Triggers a manual Sentinel scan on the repository's default branch.

**Auth:** Required  
**Request body:** none

**Response `202`:**
```json
{
  "scan_id": "scan_01XYZ",
  "status": "queued",
  "message": "Sentinel scan queued for infrazero"
}
```

---

### `GET /repos/:repoId/sentinel/activity`
Returns recent Sentinel events for a repo (findings, PR reviews, scan completions).

**Auth:** Required  
**Query Params:** `limit` (default `20`), `page` (default `1`)

**Response `200`:**
```json
{
  "events": [
    {
      "id": "sent_evt_001",
      "type": "finding",
      "severity": "critical",
      "message": "race condition flagged in writer.go",
      "file": "src/writer.go",
      "line": 88,
      "timestamp": "2026-03-02T10:48:00Z",
      "timestamp_ago": "12m"
    },
    {
      "id": "sent_evt_002",
      "type": "pr_review",
      "severity": "healthy",
      "message": "PR #214 clean, merged",
      "pr_number": 214,
      "timestamp": "2026-03-02T08:00:00Z",
      "timestamp_ago": "2h"
    }
  ]
}
```

---

## 8. Fortress Agent (QA Pipeline)

### `GET /repos/:repoId/pipeline`
Returns the current live pipeline state. Used by the Pipeline page.

**Auth:** Required

**Response `200`:**
```json
{
  "repo_id": "infrazero",
  "run_id": "run_01ABC",
  "trigger": "push",
  "branch": "main",
  "commit_sha": "a3f9d12",
  "status": "running",
  "started_at": "2026-03-02T10:58:00Z",
  "steps": [
    { "id": "push",   "label": "Code Pushed",             "icon": "Code",        "state": "success",  "duration_s": 0,   "description": "Commit detected from main branch" },
    { "id": "llama",  "label": "Llama 3 Writes Test",     "icon": "Cpu",         "state": "success",  "duration_s": 4.2, "description": "AI-generated test case based on code changes" },
    { "id": "test",   "label": "Test Execution",          "icon": "TestTube2",   "state": "failed",   "duration_s": 2.1, "description": "Running test suite against new code" },
    { "id": "claude", "label": "Claude Analyzes Error",   "icon": "FileSearch",  "state": "running",  "duration_s": 3.8, "description": "Analyzing failure patterns and root cause" },
    { "id": "fix",    "label": "Auto Code Fix",           "icon": "Wrench",      "state": "idle",     "duration_s": null,"description": "Generating automated fix based on analysis" },
    { "id": "rerun",  "label": "Test Re-run",             "icon": "RotateCcw",   "state": "idle",     "duration_s": null,"description": "Validating fix with test suite" },
    { "id": "pass",   "label": "Test Pass",               "icon": "CheckCircle", "state": "idle",     "duration_s": null,"description": "Self-healing loop completed successfully" }
  ]
}
```

`step.state`: `idle` | `running` | `success` | `failed`

---

### `GET /repos/:repoId/pipeline/runs`
Returns historical pipeline runs.

**Auth:** Required  
**Query Params:** `limit` (default `20`), `page` (default `1`), `mode` (`recent` | `historical`)

**Response `200`:**
```json
{
  "runs": [
    { "run_id": "run_01ABC", "status": "success", "branch": "main", "commit_sha": "a3f9d12", "started_at": "2026-03-02T10:56:00Z", "duration_s": 18, "timestamp_ago": "2m ago" },
    { "run_id": "run_00ZZZ", "status": "failed",  "branch": "main", "commit_sha": "b2e8c11", "started_at": "2026-03-02T10:41:00Z", "duration_s": 9,  "timestamp_ago": "23m ago" }
  ],
  "total": 47
}
```

`status`: `success` | `failed` | `running` | `queued`

---

### `POST /repos/:repoId/pipeline/trigger`
Manually triggers a Fortress pipeline run.

**Auth:** Required  
**Request body:**
```json
{
  "branch": "main"
}
```

**Response `202`:**
```json
{
  "run_id": "run_01NEW",
  "status": "queued"
}
```

---

### `GET /repos/:repoId/pipeline/runs/:runId`
Returns detailed results for a single pipeline run.

**Auth:** Required

**Response `200`:**
```json
{
  "run_id": "run_01ABC",
  "status": "success",
  "branch": "main",
  "commit_sha": "a3f9d12",
  "started_at": "2026-03-02T10:56:00Z",
  "finished_at": "2026-03-02T10:56:18Z",
  "duration_s": 18,
  "steps": [ /* same structure as GET /pipeline */ ],
  "test_results": {
    "total": 247,
    "passed": 247,
    "failed": 0,
    "flaky": 0,
    "stability_pct": 100
  },
  "fixes_applied": 0,
  "logs_url": "https://api.velocis.dev/v1/repos/infrazero/pipeline/runs/run_01ABC/logs"
}
```

---

## 9. Cortex Agent (Service Map)

### `GET /repos/:repoId/cortex/services`
Returns all microservices discovered in the repository and their interconnections. Used to render the 3D service map.

**Auth:** Required

**Response `200`:**
```json
{
  "repo_id": "infrazero",
  "last_updated_ago": "2 minutes ago",
  "last_updated_at": "2026-03-02T10:58:00Z",
  "services": [
    {
      "id": 1,
      "name": "auth-service",
      "status": "healthy",
      "layer": "edge",
      "position": { "x": -8, "y": 0.3, "z": -4 },
      "connections": [2, 3],
      "metrics": {
        "p95_latency": "38ms",
        "error_rate_pct": 0.0,
        "sparkline": [60, 75, 65]
      },
      "tests": {
        "total": 100,
        "passing": 100,
        "errors": 0
      },
      "last_deployment_ago": "2h ago"
    },
    {
      "id": 2,
      "name": "api-gateway",
      "status": "warning",
      "layer": "edge",
      "position": { "x": -2, "y": 0.3, "z": -6 },
      "connections": [4, 5, 6],
      "metrics": {
        "p95_latency": "91ms",
        "error_rate_pct": 3.2,
        "sparkline": [55, 80, 95]
      },
      "tests": {
        "total": 100,
        "passing": 94,
        "errors": 4
      },
      "last_deployment_ago": "3h ago"
    },
    {
      "id": 6,
      "name": "analytics-service",
      "status": "critical",
      "layer": "compute",
      "position": { "x": 4, "y": 0.3, "z": 6 },
      "connections": [9],
      "metrics": {
        "p95_latency": "820ms",
        "error_rate_pct": 14.3,
        "sparkline": [45, 72, 100]
      },
      "tests": {
        "total": 100,
        "passing": 85,
        "errors": 12
      },
      "last_deployment_ago": "15m ago"
    }
  ],
  "blast_radius_pairs": [
    { "source_id": 2, "target_id": 6 },
    { "source_id": 6, "target_id": 9 }
  ],
  "critical_service_id": 6
}
```

`service.status`: `healthy` | `warning` | `critical`  
`service.layer`: `edge` | `compute` | `data`

---

### `GET /repos/:repoId/cortex/services/:serviceId`
Returns detailed metrics and timeline events for a single microservice.

**Auth:** Required

**Response `200`:**
```json
{
  "id": 6,
  "name": "analytics-service",
  "status": "critical",
  "layer": "compute",
  "metrics": {
    "p95_latency": "820ms",
    "error_rate_pct": 14.3,
    "sparkline": [45, 72, 100]
  },
  "tests": { "total": 100, "passing": 85, "errors": 12 },
  "last_deployment_ago": "15m ago",
  "timeline_events": [
    { "position_pct": 60, "label": "Anomaly Detected",            "color": "#ef4444" },
    { "position_pct": 82, "label": "Rollback Initiated",           "color": "#f59e0b" },
    { "position_pct": 91, "label": "analytics-service CRIT",       "color": "#ef4444" }
  ],
  "fortress_action": "Rerouting"
}
```

---

### `GET /repos/:repoId/cortex/timeline`
Returns deployment and event timeline for the entire service map (used in the historical timeline bar in Cortex page).

**Auth:** Required

**Response `200`:**
```json
{
  "events": [
    { "position_pct": 7,  "label": "Deploy v2.0",          "color": "#22c55e" },
    { "position_pct": 19, "label": "Sentinel Scan",         "color": "#8b5cf6" },
    { "position_pct": 33, "label": "Deploy v2.1",           "color": "#22c55e" },
    { "position_pct": 60, "label": "Anomaly Detected",      "color": "#ef4444" },
    { "position_pct": 82, "label": "Rollback Initiated",    "color": "#f59e0b" }
  ]
}
```

---

## 10. Workspace (AI Chat & Annotations)

The Workspace page is a split-pane view: Monaco editor on the left, Sentinel AI chat on the right. The current file and annotations are repo-scoped.

### `GET /repos/:repoId/workspace/files`
Lists files in the repository (for the file picker in the Workspace).

**Auth:** Required  
**Query Params:** `path` (default `/`) — directory path to list

**Response `200`:**
```json
{
  "path": "/src",
  "files": [
    { "name": "auth.controller.ts", "type": "file", "path": "/src/auth.controller.ts" },
    { "name": "auth.service.ts",    "type": "file", "path": "/src/auth.service.ts" },
    { "name": "dto",                "type": "dir",  "path": "/src/dto" }
  ]
}
```

---

### `GET /repos/:repoId/workspace/files/content`
Returns the raw content of a specific file.

**Auth:** Required  
**Query Params:** `path` — e.g., `/src/auth.controller.ts`, `ref` (default `main`)

**Response `200`:**
```json
{
  "path": "/src/auth.controller.ts",
  "ref": "main",
  "content": "import { Controller, Post, Body ... } ...",
  "language": "typescript"
}
```

---

### `GET /repos/:repoId/workspace/annotations`
Returns Sentinel's code annotations for a specific file (warnings, suggestions, info).

**Auth:** Required  
**Query Params:** `path` — file path, `ref` (default `main`)

**Response `200`:**
```json
{
  "path": "/src/auth.controller.ts",
  "annotations": [
    {
      "id": "ann_001",
      "line": 15,
      "type": "warning",
      "title": "Potential Race Condition",
      "message": "Token generation is happening without proper rate limiting, which could lead to security vulnerabilities.",
      "suggestions": [
        "Add rate limiting middleware",
        "Implement token expiry validation",
        "Use Redis session management"
      ]
    },
    {
      "id": "ann_002",
      "line": 32,
      "type": "suggestion",
      "title": "Refactor Opportunity",
      "message": "Suggested refactor: Extract user validation into a separate method for better testability.",
      "suggestions": []
    },
    {
      "id": "ann_003",
      "line": 39,
      "type": "info",
      "title": "Production Logging",
      "message": "Consider adding proper error logging for production debugging.",
      "suggestions": []
    }
  ]
}
```

`annotation.type`: `warning` | `suggestion` | `info` | `critical`

---

### `POST /repos/:repoId/workspace/chat`
Sends a message to the Sentinel AI chat. Returns a streamed or single response.

**Auth:** Required  
**Request body:**
```json
{
  "message": "Can you help me refactor this auth controller?",
  "context": {
    "file_path": "/src/auth.controller.ts",
    "line": 15,
    "annotation_id": "ann_001"
  },
  "language": "en"
}
```

`language`: `en` | `hi` | `ta` (multilingual support)

**Response `200` (non-streaming):**
```json
{
  "message_id": "msg_01XYZ",
  "role": "sentinel",
  "content": "I can help you refactor this code. Let me analyze the surrounding logic first.",
  "timestamp": "2026-03-02T11:00:00Z",
  "timestamp_ago": "Just now"
}
```

> **Note:** If streaming is preferred, use `Transfer-Encoding: chunked` with `Content-Type: text/event-stream`. The frontend should support SSE for real-time responses.

---

### `GET /repos/:repoId/workspace/chat/history`
Returns the message history for the workspace chat session.

**Auth:** Required  
**Query Params:** `limit` (default `50`)

**Response `200`:**
```json
{
  "messages": [
    {
      "message_id": "msg_000",
      "role": "sentinel",
      "is_analysis": true,
      "analysis": {
        "annotation_id": "ann_001",
        "line": 15,
        "title": "Potential Race Condition",
        "description": "Token generation is happening without proper rate limiting.",
        "suggestions": ["Add rate limiting middleware", "Implement token expiry validation"]
      },
      "timestamp": "2026-03-02T10:58:00Z",
      "timestamp_ago": "2 min ago"
    },
    {
      "message_id": "msg_001",
      "role": "user",
      "content": "Can you help me refactor this?",
      "timestamp": "2026-03-02T10:59:00Z",
      "timestamp_ago": "1 min ago"
    }
  ]
}
```

`message.role`: `user` | `sentinel`

---

## 11. Infrastructure

The Infrastructure page shows auto-generated Terraform/IaC code and cloud cost predictions based on analysis of the repository.

### `GET /repos/:repoId/infrastructure`
Returns the full infrastructure page data: cost breakdown, environment, and IaC config.

**Auth:** Required  
**Query Params:** `environment` — `production` | `staging` | `preview` (default: `production`)

**Response `200`:**
```json
{
  "repo_id": "infrazero",
  "environment": "production",
  "cloud_provider": "aws",
  "region": "ap-south-1",
  "monthly_cost_usd": 18.42,
  "cost_breakdown": [
    { "service": "Lambda",         "cost_usd": 8.50, "percentage": 46, "color": "#3b82f6" },
    { "service": "API Gateway",    "cost_usd": 4.20, "percentage": 23, "color": "#8b5cf6" },
    { "service": "DynamoDB",       "cost_usd": 3.40, "percentage": 18, "color": "#10b981" },
    { "service": "Step Functions", "cost_usd": 1.82, "percentage": 10, "color": "#f59e0b" },
    { "service": "Misc",           "cost_usd": 0.50, "percentage": 3,  "color": "#6b7280" }
  ],
  "iac_generated_at": "2026-03-02T10:55:00Z",
  "iac_source_commit": "a3f9d12",
  "iac_source_branch": "main"
}
```

---

### `GET /repos/:repoId/infrastructure/terraform`
Returns the generated Terraform code for the repository's inferred infrastructure.

**Auth:** Required  
**Query Params:** `environment` — `production` | `staging` | `preview`

**Response `200`:**
```json
{
  "environment": "production",
  "generated_at": "2026-03-02T10:55:00Z",
  "source_commit": "a3f9d12",
  "terraform_code": "# Generated by Velocis IaC Predictor\n# Source: latest commit on main branch\n# Region: ap-south-1\n\nterraform {\n  required_providers {\n    aws = {\n      source  = \"hashicorp/aws\"\n      version = \"~> 5.0\"\n    }\n  }\n}\n..."
}
```

---

### `POST /repos/:repoId/infrastructure/generate`
Triggers a fresh IaC generation from the latest commit.

**Auth:** Required  
**Request body:**
```json
{
  "environment": "production",
  "branch": "main"
}
```

**Response `202`:**
```json
{
  "job_id": "job_01IAC_XYZ",
  "status": "queued",
  "message": "IaC generation queued for infrazero/production"
}
```

---

## 12. Activity Feed

### `GET /activity`
Returns the global activity feed across all repositories (used in the Dashboard's right-panel Activity feed).

**Auth:** Required  
**Query Params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `agent` | `string` | all | Filter by `sentinel` \| `fortress` \| `cortex` |
| `repo_id` | `string` | all | Filter by repo |
| `limit` | `number` | `20` | |
| `page` | `number` | `1` | |

**Response `200`:**
```json
{
  "events": [
    {
      "id": "evt_001",
      "agent": "sentinel",
      "repo_id": "infrazero",
      "repo_name": "InfraZero",
      "message": "Flagged potential race condition",
      "severity": "critical",
      "timestamp": "2026-03-02T10:48:00Z",
      "timestamp_ago": "12m"
    }
  ],
  "unread_count": 5,
  "total": 142,
  "page": 1,
  "per_page": 20
}
```

`event.agent`: `sentinel` | `fortress` | `cortex`  
`event.severity`: `critical` | `warning` | `info` | `healthy`

---

## 13. System Health

### `GET /system/health`
Returns current system-level metrics for the Velocis platform. Shown in the Dashboard sidebar System panel.

**Auth:** Required

**Response `200`:**
```json
{
  "api_latency_ms": 38,
  "queue_depth": 12,
  "agent_uptime_pct": 99.7,
  "storage_used_pct": 61,
  "agents": [
    { "name": "sentinel", "status": "running", "uptime_pct": 99.9 },
    { "name": "fortress", "status": "running", "uptime_pct": 99.7 },
    { "name": "cortex",   "status": "running", "uptime_pct": 99.5 }
  ]
}
```

---

## 14. Shared Types / Enums

```typescript
// Repository health status
type RepoStatus = "healthy" | "warning" | "critical";

// Agent identifiers
type AgentName = "sentinel" | "fortress" | "cortex";

// Pipeline step state
type StepState = "idle" | "running" | "success" | "failed";

// Severity level
type Severity = "critical" | "warning" | "info" | "healthy";

// Annotation type
type AnnotationType = "critical" | "warning" | "suggestion" | "info";

// Service layer (in Cortex)
type ServiceLayer = "edge" | "compute" | "data";

// Visibility
type Visibility = "public" | "private";

// Environment
type Environment = "production" | "staging" | "preview";

// Chat message role
type MessageRole = "user" | "sentinel";

// Supported languages (for multilingual AI responses)
type Language = "en" | "hi" | "ta";
```

---

## 15. Error Format

All errors return a consistent shape:

```json
{
  "error": {
    "code": "REPO_NOT_FOUND",
    "message": "Repository 'foobar' not found or not installed.",
    "status": 404
  }
}
```

### Common Error Codes

| HTTP Status | Code | Description |
|-------------|------|-------------|
| `400` | `INVALID_REQUEST` | Missing or malformed request body/params |
| `401` | `UNAUTHORIZED` | Missing or invalid JWT token |
| `403` | `FORBIDDEN` | User does not have access to this resource |
| `404` | `REPO_NOT_FOUND` | Repository not found or not installed |
| `404` | `NOT_FOUND` | Generic resource not found |
| `409` | `ALREADY_INSTALLED` | Velocis already installed on this repo |
| `422` | `GITHUB_OAUTH_FAILED` | GitHub OAuth exchange failed |
| `429` | `RATE_LIMITED` | Too many requests |
| `500` | `INTERNAL_ERROR` | Unexpected server error |
| `503` | `AGENT_UNAVAILABLE` | Sentinel/Fortress/Cortex agent temporarily unavailable |

---

## 16. Webhook Events (GitHub → Backend)

The backend registers a GitHub webhook on each installed repository at time of installation. The following events must be handled:

### `POST /webhooks/github`
Receives GitHub webhook payloads.

**Headers:** `X-Hub-Signature-256` — HMAC-SHA256 signature (must be verified)

| GitHub Event | Action Taken by Backend |
|---|---|
| `push` | Trigger Fortress pipeline run for the pushed branch |
| `pull_request` (opened / synchronize / reopened) | Queue Sentinel PR analysis |
| `pull_request` (closed / merged) | Update Sentinel analysis state to `merged` / `closed` |
| `pull_request_review` | Log to activity feed |
| `deployment` | Record deployment event for Cortex timeline |

---

## Notes for the Backend Team

1. **Authentication flow:** The frontend only supports **GitHub OAuth**. There are no email/password login forms. After OAuth, issue a short-lived JWT (recommended 24h) returned either as a `Set-Cookie` (HttpOnly, Secure) or in the JSON body.

2. **Repository IDs:** The frontend routes use human-readable slugs (e.g., `infrazero`). The backend should map these to internal IDs. The `/repos/:repoId` path param is the **slug**, not the numeric GitHub ID.

3. **Real-time updates:** The Dashboard Activity feed shows "LIVE" data. Recommend implementing either:
   - **Server-Sent Events (SSE):** `GET /events/stream` for real-time activity push
   - **Or polling:** Frontend currently polls every ~30s as fallback

4. **Multilingual AI:** The Workspace chat (`POST /workspace/chat`) passes `language: "en" | "hi" | "ta"`. The backend must route this to the appropriate LLM prompt or translation layer.

5. **Pipeline polling:** The Pipeline page polls `GET /repos/:repoId/pipeline` every ~2s when `autoRefresh` is on. Optimize this endpoint for latency. Consider SSE here too.

6. **Cortex 3D positions:** The `position.x/y/z` values in the service map are layout coordinates used to place nodes in a 3D scene. The backend can return any consistent coordinate set; the frontend will render them as-is.

7. **Terraform code:** The `GET /infrastructure/terraform` response returns raw Terraform HCL as a string in the JSON. The frontend renders it in a Monaco editor with HCL syntax highlighting.

8. **CORS:** The backend must allow the frontend origin (e.g., `https://app.velocis.dev`) with `Authorization` header support and `credentials: true` if using cookies.
