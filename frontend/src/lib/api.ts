// ─── Delete Repo ────────────────────────────────────────────────────────────
/** Delete a repo from Velocis database by ID */
export const deleteRepo = async (repoId: string): Promise<{ success: boolean }> => {
  return request(`/api/repos/${repoId}`, { method: 'DELETE' });
};
/**
 * Velocis — API Client
 * Base URL: VITE_BACKEND_URL  (defaults to http://localhost:3001)
 * Auth:     Session cookie (velocis_session) set by OAuth callback
 *           + legacy Bearer JWT fallback for older endpoints
 */

const BASE_URL = (import.meta.env.VITE_BACKEND_URL as string) ?? 'http://localhost:3001';

// ─── Typed API error ─────────────────────────────────────────────────────────
/** Error thrown by `request()` when the server returns a non-2xx response. */
export class ApiError extends Error {
  readonly code?: string;
  readonly installUrl?: string;
  constructor(message: string, code?: string, installUrl?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.installUrl = installUrl;
  }
}

// ─── Token helpers ────────────────────────────────────────────────────────────
export const TOKEN_KEY = 'velocis_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────
async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',   // Always send session cookie
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body?.error?.message ?? `HTTP ${res.status}`;
    throw new ApiError(msg, body?.error?.code, body?.error?.install_url);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ─── Shared types ─────────────────────────────────────────────────────────────
export type RepoStatus = 'healthy' | 'warning' | 'critical';
export type AgentName = 'sentinel' | 'fortress' | 'cortex';
export type StepState = 'idle' | 'running' | 'success' | 'failed';
export type Severity = 'critical' | 'warning' | 'info' | 'healthy';
export type AnnotationType = 'critical' | 'warning' | 'suggestion' | 'info';
export type ServiceLayer = 'edge' | 'compute' | 'data';
export type Environment = 'production' | 'staging' | 'preview';
export type MessageRole = 'user' | 'sentinel';
export type Language = 'en' | 'hi' | 'ta';

// ─── 1. Auth ──────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  github_id: number;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
  created_at?: string;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
}

/** Redirects browser to GitHub OAuth consent screen */
export function redirectToGitHubOAuth(): void {
  window.location.href = `${BASE_URL}/api/auth/github`;
}

/** Invalidates server session */
export const logout = (): Promise<void> =>
  request('/api/auth/logout', { method: 'POST' });

// ─── 2. User ──────────────────────────────────────────────────────────────────
export const getMe = (): Promise<AuthUser> => request('/api/me');

// ─── 3. GitHub Repositories ───────────────────────────────────────────────────
export interface GitHubRepo {
  github_id: number;
  name: string;
  full_name: string;
  visibility: 'public' | 'private';
  language: string;
  language_color: string;
  updated_at: string;
  velocis_installed: boolean;
}

export interface GetReposResponse {
  repos: GitHubRepo[];
  total: number;
  page: number;
  per_page: number;
}

export const getGithubRepos = (params?: {
  q?: string;
  page?: number;
  per_page?: number;
}): Promise<GetReposResponse> => {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.per_page) qs.set('per_page', String(params.per_page));
  const query = qs.toString() ? `?${qs}` : '';
  return request(`/api/github/repos${query}`);
};

/** Fetch repos using the session-cookie auth (new OAuth flow) */
export interface SessionReposResponse {
  repos: Array<{
    id: number;
    name: string;
    fullName: string;
    isPrivate: boolean;
    language: string | null;
    updatedAt: string;
    htmlUrl: string;
    description: string | null;
    stars: number;
    ownerId: number;
    ownerLogin: string;
  }>;
  login: string;
}

export const getSessionRepos = (): Promise<SessionReposResponse> =>
  request('/api/repos');

// ─── 4. Onboarding / Installation ─────────────────────────────────────────────
export interface InstallStep {
  id: string;
  label: string;
  status: 'queued' | 'in_progress' | 'complete' | 'failed';
}

export interface InstallJobResponse {
  job_id: string;
  status: 'queued' | 'in_progress' | 'complete' | 'failed';
  steps: InstallStep[];
  repo_slug?: string;
  overall_status?: 'queued' | 'in_progress' | 'complete' | 'failed';
}

export const installRepo = (
  repoId: number | string,
  body?: { repoName?: string; language?: string; repoOwner?: string; repoFullName?: string }
): Promise<InstallJobResponse> =>
  request(`/api/repos/${repoId}/install`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

export const getInstallStatus = (repoId: number | string): Promise<InstallJobResponse> =>
  request(`/api/repos/${repoId}/install/status`);

// ─── 5. Dashboard ─────────────────────────────────────────────────────────────
export interface ActivityEvent {
  id: string;
  agent: AgentName;
  repo_id: string;
  repo_name: string;
  message: string;
  severity: Severity;
  timestamp_ago: string;
  timestamp: string;
}

export interface DashboardRepo {
  id: string;
  name: string;
  status: RepoStatus;
  language: string;
  last_activity: { agent: AgentName; message: string; severity: Severity; timestamp_ago: string }[];
  commit_sparkline: number[];
  commit_trend_label: string;
  commit_trend_direction: 'up' | 'down' | 'volatile';
  installed_at?: string;
}

export interface DashboardResponse {
  user: { name: string; avatar_url: string };
  summary: {
    healthy: number;
    warning: number;
    critical: number;
    open_risks: number;
    agents_running: number;
  };
  repos: DashboardRepo[];
  activity_feed: ActivityEvent[];
  recent_deployments: { repo_id: string; environment: Environment; deployed_at: string; status: string }[];
  system: {
    api_latency_ms: number;
    queue_depth: number;
    agent_uptime_pct: number;
    storage_used_pct: number;
  };
}

export const getDashboard = (range?: '1h' | '24h' | '7d' | '30d'): Promise<DashboardResponse> =>
  request(`/api/dashboard${range ? `?range=${range}` : ''}`);

// ─── 6. Repository Overview ───────────────────────────────────────────────────
export interface RepoDetail {
  id: string;
  name: string;
  status: RepoStatus;
  status_label: string;
  visibility: 'public' | 'private';
  language: string;
  last_scanned_ago: string;
  last_scanned_at: string;
  size_loc: string;
  metrics: {
    risk_score: string;
    test_stability_pct: number;
    architecture_drift: string;
    last_action_ago: string;
  };
  sentinel: { active_prs: number; last_update_ago: string };
  fortress: { status_message: string; last_run_ago: string };
  cortex: { last_update_ago: string; service_count: number };
  risks: { critical: number; medium: number; low: number };
  commit_sparkline?: number[];
  commit_trend_label?: string;
  commit_trend_direction?: 'up' | 'down' | 'flat';
  commit_by_month?: { month: string; count: number; days: number[] }[];
  installed_at?: string;
}

export const getRepo = (repoId: string): Promise<RepoDetail> =>
  request(`/api/repos/${repoId}`);

// ─── 7. Sentinel ──────────────────────────────────────────────────────────────
export interface PrFinding {
  id: string;
  severity: Severity;
  file: string;
  line: number;
  message: string;
  suggestion?: string;
}

export interface SentinelPr {
  pr_number: number;
  title: string;
  author: string;
  branch: string;
  risk_score: number;
  risk_level: 'low' | 'warning' | 'critical';
  state: 'open' | 'closed' | 'merged';
  created_at: string;
  findings: PrFinding[];
}

export interface SentinelPrsResponse { prs: SentinelPr[] }

export const getSentinelPrs = (repoId: string): Promise<SentinelPrsResponse> =>
  request(`/api/repos/${repoId}/sentinel/prs`);

export const getSentinelPr = (repoId: string, prNumber: number): Promise<SentinelPr> =>
  request(`/api/repos/${repoId}/sentinel/prs/${prNumber}`);

export const triggerSentinelScan = (repoId: string): Promise<{ scan_id: string; status: string; message: string }> =>
  request(`/api/repos/${repoId}/sentinel/scan`, { method: 'POST' });

export interface SentinelEvent {
  id: string;
  type: string;
  severity: Severity;
  message: string;
  file?: string;
  line?: number;
  pr_number?: number;
  timestamp: string;
  timestamp_ago: string;
}

export const getSentinelActivity = (
  repoId: string,
  params?: { limit?: number; page?: number },
): Promise<{ events: SentinelEvent[] }> => {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.page) qs.set('page', String(params.page));
  return request(`/api/repos/${repoId}/sentinel/activity${qs.toString() ? `?${qs}` : ''}`);
};

// ─── 8. Fortress (Pipeline) ───────────────────────────────────────────────────
export interface PipelineStep {
  id: string;
  label: string;
  icon: string;
  state: StepState;
  duration_s: number | null;
  description: string;
  /** Rich data written by executeFortressPipeline — file name, test counts, Claude explanation etc. */
  stepData?: Record<string, unknown>;
}

export interface PipelineRun {
  repo_id: string;
  run_id: string;
  trigger: string;
  branch: string;
  commit_sha: string;
  status: 'running' | 'success' | 'failed' | 'queued';
  started_at: string;
  steps: PipelineStep[];
}

export interface PipelineRunSummary {
  run_id: string;
  status: 'success' | 'failed' | 'running' | 'queued';
  branch: string;
  commit_sha: string;
  started_at: string;
  duration_s: number;
  timestamp_ago: string;
}

export const getPipeline = (repoId: string): Promise<PipelineRun> =>
  request(`/api/repos/${repoId}/pipeline`);

export const getPipelineRuns = (
  repoId: string,
  params?: { limit?: number; page?: number; mode?: 'recent' | 'historical' },
): Promise<{ runs: PipelineRunSummary[]; total: number }> => {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.page) qs.set('page', String(params.page));
  if (params?.mode) qs.set('mode', params.mode);
  return request(`/api/repos/${repoId}/pipeline/runs${qs.toString() ? `?${qs}` : ''}`);
};

export const triggerPipeline = (
  repoId: string,
  branch = 'main',
): Promise<{ run_id: string; status: string }> =>
  request(`/api/repos/${repoId}/pipeline/trigger`, {
    method: 'POST',
    body: JSON.stringify({ branch }),
  });

// ─── 9. Cortex (Service Map) ──────────────────────────────────────────────────
export interface CortexService {
  id: number;
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  layer: ServiceLayer;
  position: { x: number; y: number; z: number };
  connections: number[];
  metrics: { p95_latency: string; error_rate_pct: number; sparkline: number[] };
  tests: { total: number; passing: number; errors: number };
  last_deployment_ago: string;
}

export interface CortexServicesResponse {
  repo_id: string;
  last_updated_ago: string;
  last_updated_at: string;
  services: CortexService[];
  blast_radius_pairs: { source_id: number; target_id: number }[];
  critical_service_id: number | null;
}

export interface TimelineEvent {
  position_pct: number;
  label: string;
  color: string;
}

export const getCortexServices = (repoId: string): Promise<CortexServicesResponse> =>
  request(`/api/repos/${repoId}/cortex/services`);

export const getCortexServiceDetail = (
  repoId: string,
  serviceId: number,
): Promise<CortexService & { timeline_events: TimelineEvent[]; fortress_action: string }> =>
  request(`/api/repos/${repoId}/cortex/services/${serviceId}`);

export const getCortexTimeline = (repoId: string): Promise<{ events: TimelineEvent[] }> =>
  request(`/api/repos/${repoId}/cortex/timeline`);

export interface CortexFileNode {
  id: string;
  name: string;
  path: string;
  type: 'module' | 'util' | 'config' | 'test' | 'component';
  language: string;
  linesOfCode: number;
  complexity: number;
  functions: string[];
  functionCalls?: Record<string, string[]>;
  importsFrom: string[];
  importedBy: string[];
  lastModified: string;
}

export interface CortexFileImport {
  from: string;
  to: string;
  count: number;
  functions: string[];
}

export interface CortexServiceFilesResponse {
  service: {
    id: number;
    name: string;
    layer: ServiceLayer;
    status: 'healthy' | 'warning' | 'critical';
  };
  files: CortexFileNode[];
  imports: CortexFileImport[];
  stats: {
    totalFiles: number;
    totalLOC: number;
    avgComplexity: number;
    mostComplex?: string;
    entryPoint?: string;
  };
}

export const getCortexServiceFiles = (
  repoId: string,
  serviceId: number
): Promise<CortexServiceFilesResponse> =>
  request(`/api/repos/${repoId}/cortex/services/${serviceId}/files`);

export const rebuildCortex = (repoId: string): Promise<{ success: boolean; message: string; stats: { nodes: number; edges: number; services: number } }> =>
  request(`/api/repos/${repoId}/cortex/rebuild`, { method: 'POST' });

// ─── 10. Workspace ────────────────────────────────────────────────────────────
export interface WorkspaceFile {
  name: string;
  type: 'file' | 'dir';
  path: string;
}

export interface WorkspaceBranchesResponse {
  default_branch: string;
  branches: string[];
}

export interface CodeAnnotation {
  id: string;
  line: number;
  type: AnnotationType;
  title: string;
  message: string;
  suggestions: string[];
}

export interface WorkspaceReviewFinding {
  severity: 'critical' | 'warning' | 'info';
  file_path: string;
  line?: number;
  title: string;
  description: string;
  fix_suggestion: string;
}

export interface WorkspaceAutoFix {
  file_path: string;
  reason: string;
  fixed_code: string;
}

export interface WorkspaceReviewResult {
  summary: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  files_reviewed: number;
  findings: WorkspaceReviewFinding[];
  auto_fix: WorkspaceAutoFix | null;
}

export interface ChatMessage {
  message_id: string;
  role: MessageRole;
  content?: string;
  is_analysis?: boolean;
  analysis?: {
    annotation_id: string;
    line: number;
    title: string;
    description: string;
    suggestions: string[];
  };
  review?: WorkspaceReviewResult;
  auto_fix?: WorkspaceAutoFix | null;
  timestamp: string;
  timestamp_ago: string;
}

export const getWorkspaceBranches = (
  repoId: string,
): Promise<WorkspaceBranchesResponse> =>
  request(`/api/repos/${repoId}/workspace/branches`);

export const getWorkspaceFiles = (
  repoId: string,
  path = '/',
  recursive = false,
  ref?: string,
): Promise<{ path: string; files: WorkspaceFile[] }> =>
  request(
    `/api/repos/${repoId}/workspace/files?path=${encodeURIComponent(path)}${recursive ? '&recursive=true' : ''}${ref ? `&ref=${encodeURIComponent(ref)}` : ''}`,
  );

export const getFileContent = (
  repoId: string,
  filePath: string,
  ref = 'main',
): Promise<{ path: string; ref: string; content: string; language: string }> =>
  request(
    `/api/repos/${repoId}/workspace/files/content?path=${encodeURIComponent(filePath)}&ref=${ref}`,
  );

export const getAnnotations = (
  repoId: string,
  filePath: string,
  ref = 'main',
): Promise<{ path: string; annotations: CodeAnnotation[] }> =>
  request(
    `/api/repos/${repoId}/workspace/annotations?path=${encodeURIComponent(filePath)}&ref=${ref}`,
  );

export const postChatMessage = (
  repoId: string,
  payload: { message: string; context?: { file_path?: string; line?: number; annotation_id?: string; ref?: string }; language?: Language },
): Promise<ChatMessage> =>
  request(`/api/repos/${repoId}/workspace/chat`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const pushWorkspaceFile = (
  repoId: string,
  payload: { file_path: string; content: string; branch: string; commit_message?: string },
): Promise<{ success: boolean; file_path: string; branch: string; commit_sha: string; message: string }> =>
  request(`/api/repos/${repoId}/workspace/push`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const reviewWorkspaceCode = (
  repoId: string,
  payload?: { language?: Language; ref?: string },
): Promise<ChatMessage> =>
  request(`/api/repos/${repoId}/workspace/review`, {
    method: 'POST',
    body: JSON.stringify(payload ?? {}),
  });

export const getChatHistory = (
  repoId: string,
  limit = 50,
): Promise<{ messages: ChatMessage[] }> =>
  request(`/api/repos/${repoId}/workspace/chat/history?limit=${limit}`);

// ─── 11. Infrastructure ───────────────────────────────────────────────────────
export interface CostBreakdownItem {
  service: string;
  cost_usd: number;
  percentage: number;
  color: string;
}

export interface InfrastructureData {
  repo_id: string;
  environment: Environment;
  cloud_provider: string;
  region: string;
  monthly_cost_usd: number;
  cost_breakdown: CostBreakdownItem[];
  iac_generated_at: string;
  iac_source_commit: string;
  iac_source_branch: string;
}

export const getInfrastructure = (
  repoId: string,
  environment: Environment = 'production',
): Promise<InfrastructureData> =>
  request(`/api/repos/${repoId}/infrastructure?environment=${environment}`);

export const getTerraformCode = (
  repoId: string,
  environment: Environment = 'production',
): Promise<{ environment: Environment; generated_at: string; source_commit: string; terraform_code: string }> =>
  request(`/api/repos/${repoId}/infrastructure/terraform?environment=${environment}`);

export const generateIac = (
  repoId: string,
  environment: Environment = 'production',
  branch = 'main',
): Promise<{ job_id: string; status: string; message: string }> =>
  request(`/api/repos/${repoId}/infrastructure/generate`, {
    method: 'POST',
    body: JSON.stringify({ environment, branch }),
  });

// ─── 11b. Infrastructure Prediction (IaC Predictor) ───────────────────────────
export interface InfraPredictionData {
  impactSummary: string[];
  iacCode: string;
  costProjection: string;
  confidenceScore: number;
}

export interface InfraPredictionResponse {
  status: 'success';
  data: InfraPredictionData;
}

export const predictInfrastructure = (
  codeContent: string,
): Promise<InfraPredictionResponse> =>
  request('/api/infrastructure/predict', {
    method: 'POST',
    body: JSON.stringify({ codeContent }),
  });

// ─── 12. Activity Feed ────────────────────────────────────────────────────────
export const getActivity = (params?: {
  agent?: AgentName;
  repo_id?: string;
  limit?: number;
  page?: number;
}): Promise<{ events: ActivityEvent[]; unread_count: number; total: number; page: number; per_page: number }> => {
  const qs = new URLSearchParams();
  if (params?.agent) qs.set('agent', params.agent);
  if (params?.repo_id) qs.set('repo_id', params.repo_id);
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.page) qs.set('page', String(params.page));
  return request(`/api/activity${qs.toString() ? `?${qs}` : ''}`);
};

// ─── 13. System Health ────────────────────────────────────────────────────────
export interface SystemHealth {
  api_latency_ms: number;
  queue_depth: number;
  agent_uptime_pct: number;
  storage_used_pct: number;
  agents: { name: AgentName; status: 'running' | 'stopped' | 'degraded'; uptime_pct: number }[];
}

export const getSystemHealth = (): Promise<SystemHealth> => request('/api/system/health');
