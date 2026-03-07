import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { getRepo } from '../../lib/api';
import { useTutorial, AUTOMATION_TUTORIAL_KEY, AUTOMATION_STEPS } from '../../lib/tutorial';
import { useTheme } from '../../lib/theme';
import { ChevronLeft, Shield, TestTube2, Cloud, AlertCircle, Bot, ChevronDown, ChevronUp, FileCode, Zap, RotateCcw, Check, X, Sun, Moon } from 'lucide-react';
import { AppNavbarProfile } from '../components/AppNavbarProfile';
import lightLogoImg from '../../../LightLogo.png';
import darkLogoImg from '../../../DarkLogo.png';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const cardCls = [
    "bg-white dark:bg-zinc-900",
    "border border-[rgba(16,24,40,0.06)] dark:border-zinc-800",
    "shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_rgba(16,24,40,0.06)]",
    "ring-1 ring-inset ring-black/5 dark:ring-white/10",
].join(" ");

interface SentinelFinding {
    severity: string;
    category: string;
    title: string;
    description: string;
    mentorExplanation?: string;
    filePath?: string;
    startLine?: number;
    suggestedFix?: string;
    estimatedFixEffort?: string;
}

interface InfraCostForecast {
    totalMonthlyCostUsd?: number;
    totalYearlyCostUsd?: number;
    confidence?: string;
    [key: string]: any;
}

interface InfrastructurePlan {
    detectedPatterns: any[];
    architectureNotes: string;
    costForecast: InfraCostForecast | null;
    terraformCode: string | null;
    hasInfraChanges: boolean;
    impactSummary?: string[];
    costProjection?: string | null;
    confidenceScore?: number | null;
}

interface AutomationReportData {
    status: string;
    error?: string | null;
    sentinel: {
        overallRisk: string;
        riskScore: number;
        summary: string;
        findings: SentinelFinding[];
        fileSummaries: any[];
        prioritizedActionItems: string[];
        totalFindings: number;
        criticalFindings: number;
        highFindings: number;
    } | null;
    fortress: {
        testPlanText: string | null;
        testStabilityPct: number;
    } | null;
    infrastructure: {
        detectedPatterns: any[];
        architectureNotes: string;
        costForecast: InfraCostForecast | null;
        terraformCode: string | null;
        hasInfraChanges: boolean;
        plans?: {
            beforeChanges: InfrastructurePlan | null;
            afterSentinelChanges: InfrastructurePlan | null;
        } | null;
    } | null;
    progress?: AutomationPipelineProgress | null;
    lastUpdatedAt: string | null;
}

type PipelineStepKey = 'prepare' | 'sentinel' | 'fortress' | 'infrastructure' | 'projected';
type PipelineStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

interface AutomationPipelineStep {
    key: PipelineStepKey;
    label: string;
    status: PipelineStepStatus;
    detail?: string;
    startedAt?: string;
    completedAt?: string;
    updatedAt?: string;
}

interface AutomationPipelineProgress {
    currentStepKey: PipelineStepKey;
    steps: AutomationPipelineStep[];
}

const severityColors: Record<string, { bg: string; text: string; dot: string }> = {
    critical: { bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-600 dark:text-rose-400', dot: 'bg-rose-500' },
    high: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' },
    medium: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
    low: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
    info: { bg: 'bg-zinc-50 dark:bg-zinc-800', text: 'text-zinc-600 dark:text-zinc-400', dot: 'bg-zinc-400' },
};

const riskColors: Record<string, string> = {
    critical: 'text-rose-500',
    high: 'text-orange-500',
    medium: 'text-amber-500',
    low: 'text-emerald-500',
    clean: 'text-emerald-500',
};

const PIPELINE_STEP_ORDER: PipelineStepKey[] = ['prepare', 'sentinel', 'fortress', 'infrastructure', 'projected'];

const PIPELINE_META: Record<PipelineStepKey, { label: string; detail: string; icon: React.ComponentType<{ className?: string }> }> = {
    prepare: {
        label: 'Repository Preparation',
        detail: 'Scanning source files and preparing analysis context',
        icon: FileCode,
    },
    sentinel: {
        label: 'Sentinel Review',
        detail: 'Security, logic, and architecture deep review',
        icon: Shield,
    },
    fortress: {
        label: 'Fortress QA Plan',
        detail: 'Generating test cases and stability guidance',
        icon: TestTube2,
    },
    infrastructure: {
        label: 'Infrastructure Baseline',
        detail: 'Estimating cloud resources and baseline costs',
        icon: Cloud,
    },
    projected: {
        label: 'Projected Infrastructure',
        detail: 'Forecasting infra after Sentinel recommendations',
        icon: Bot,
    },
};

const STATUS_LABELS: Record<PipelineStepStatus, string> = {
    pending: 'Pending',
    running: 'In progress',
    completed: 'Completed',
    failed: 'Failed',
    skipped: 'Skipped',
};

function getFallbackProgress(status: string): AutomationPipelineProgress {
    return {
        currentStepKey: 'prepare',
        steps: PIPELINE_STEP_ORDER.map((key, index) => ({
            key,
            label: PIPELINE_META[key].label,
            status: status === 'completed' ? 'completed' : (status === 'running' && index === 0 ? 'running' : 'pending'),
            detail: PIPELINE_META[key].detail,
        })),
    };
}

function normalizeProgress(progress: AutomationPipelineProgress | null | undefined, status: string): AutomationPipelineProgress {
    const fallback = getFallbackProgress(status);
    if (!progress?.steps?.length) return fallback;

    const existing = new Map(progress.steps.map((step) => [step.key, step]));
    return {
        currentStepKey: progress.currentStepKey ?? fallback.currentStepKey,
        steps: PIPELINE_STEP_ORDER.map((key) => {
            const step = existing.get(key);
            return {
                key,
                label: step?.label ?? PIPELINE_META[key].label,
                status: step?.status ?? 'pending',
                detail: step?.detail ?? PIPELINE_META[key].detail,
                startedAt: step?.startedAt,
                completedAt: step?.completedAt,
                updatedAt: step?.updatedAt,
            };
        }),
    };
}

function PipelineProgressPanel({
    status,
    progress,
    title,
    subtitle,
    lastUpdatedAt,
}: {
    status: string;
    progress?: AutomationPipelineProgress | null;
    title: string;
    subtitle: string;
    lastUpdatedAt?: string | null;
}) {
    const normalized = normalizeProgress(progress, status);
    const completedCount = normalized.steps.filter(s => s.status === 'completed' || s.status === 'skipped').length;
    const pct = Math.round((completedCount / normalized.steps.length) * 100);

    return (
        <div className="w-full">
            <style>{`
                @keyframes shimmer-scan {
                    0%   { transform: translateX(-150%); }
                    100% { transform: translateX(350%); }
                }
                @keyframes pulse-ring-out {
                    0%   { transform: scale(1); opacity: 0.6; }
                    100% { transform: scale(1.8); opacity: 0; }
                }
                @keyframes travel-dash-h {
                    0%   { stroke-dashoffset: 14; }
                    100% { stroke-dashoffset: -100; }
                }
                @keyframes blink-seq {
                    0%, 70%, 100% { opacity: 1; }
                    35% { opacity: 0.15; }
                }
                .pipe-shimmer { position: relative; overflow: hidden; }
                .pipe-shimmer::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(
                        105deg,
                        transparent 20%,
                        rgba(255,255,255,0.065) 42%,
                        rgba(255,255,255,0.13) 50%,
                        rgba(255,255,255,0.065) 58%,
                        transparent 80%
                    );
                    animation: shimmer-scan 2.2s ease-in-out infinite;
                    pointer-events: none;
                }
                .pipe-ring {
                    position: absolute;
                    inset: -5px;
                    border-radius: 16px;
                    border: 1.5px solid rgba(24, 24, 27, 0.5);
                    pointer-events: none;
                    animation: pulse-ring-out 2s ease-out infinite;
                }
                .blink-dot { animation: blink-seq 1.4s ease-in-out infinite; }
                .blink-dot:nth-child(2) { animation-delay: 0.22s; }
                .blink-dot:nth-child(3) { animation-delay: 0.44s; }
                .conn-track { stroke: #d4d4d8; }
                .conn-track-done { stroke: #34d399; }
                .dark .conn-track { stroke: #3f3f46; }
                .dark .conn-track-done { stroke: #10b981; }
                .conn-run-path {
                    stroke: #18181b;
                    animation: travel-dash-h 1.5s ease-in-out infinite;
                }
            `}</style>

            {/* Header */}
            <div className="mb-7">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{title}</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">{subtitle}</p>
                {lastUpdatedAt && (
                    <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-600">
                        Last sync · {new Date(lastUpdatedAt).toLocaleTimeString()}
                    </p>
                )}
            </div>

            {/* Progress bar */}
            <div className="mb-8 space-y-1.5">
                <div className="flex justify-between items-center">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Pipeline</span>
                    <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-200">{completedCount} / {normalized.steps.length}</span>
                </div>
                <div className="h-[3px] bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-700 ease-out"
                        style={{ width: `${pct}%` }}
                    />
                </div>
            </div>

            {/* Step pipeline — horizontal left-to-right */}
            <div>
                <div>

                    {/* ── Icon row with curved SVG connectors ── */}
                    <div className="flex items-center w-full">
                        {normalized.steps.map((step, index) => {
                            const meta      = PIPELINE_META[step.key];
                            const Icon      = meta.icon;
                            const isRunning   = step.status === 'running';
                            const isCompleted = step.status === 'completed' || step.status === 'skipped';
                            const isFailed    = step.status === 'failed';
                            const isLast      = index === normalized.steps.length - 1;

                            return (
                                <React.Fragment key={step.key}>
                                    {/* Icon node */}
                                    <div className="flex-1 flex justify-center">
                                        <div className={`relative w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 border-[1.5px] transition-colors duration-300 ${
                                            isFailed    ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400' :
                                            isRunning   ? 'bg-white dark:bg-zinc-900 border-zinc-900 dark:border-zinc-400 text-zinc-900 dark:text-zinc-300 shadow-[0_0_0_3px_rgba(24,24,27,0.12)]' :
                                            isCompleted ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400 dark:border-emerald-600 text-emerald-600 dark:text-emerald-400' :
                                                          'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500'
                                        }`}>
                                            {isCompleted ? <Check className="w-5 h-5" strokeWidth={2.5} /> :
                                             isFailed    ? <X     className="w-5 h-5" strokeWidth={2.5} /> :
                                                           <Icon  className="w-5 h-5" />}
                                            {isRunning && <span className="pipe-ring" />}
                                        </div>
                                    </div>

                                    {/* Curved SVG connector to next step */}
                                    {!isLast && (
                                        <div className="flex-shrink-0 flex items-center" style={{ width: 72 }}>
                                            <svg viewBox="0 0 72 36" width={72} height={36} style={{ overflow: 'visible' }}>
                                                {/* Base S-curve track */}
                                                <path
                                                    d="M 0,18 C 18,18 18,0 36,0 C 54,0 54,18 72,18"
                                                    fill="none"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    className={isCompleted ? 'conn-track-done' : 'conn-track'}
                                                />
                                                {/* Animated traveling dash for running step */}
                                                {isRunning && (
                                                    <path
                                                        d="M 0,18 C 18,18 18,0 36,0 C 54,0 54,18 72,18"
                                                        fill="none"
                                                        strokeWidth="3"
                                                        strokeLinecap="round"
                                                        pathLength={100}
                                                        strokeDasharray="12 988"
                                                        className="conn-run-path"
                                                    />
                                                )}
                                            </svg>
                                        </div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>

                    {/* ── Card row aligned under icons ── */}
                    <div className="flex items-start w-full mt-4">
                        {normalized.steps.map((step, index) => {
                            const meta = PIPELINE_META[step.key];
                            const isRunning   = step.status === 'running';
                            const isCompleted = step.status === 'completed' || step.status === 'skipped';
                            const isFailed    = step.status === 'failed';
                            const isPending   = step.status === 'pending';
                            const isLast      = index === normalized.steps.length - 1;

                            return (
                                <React.Fragment key={step.key}>
                                    <div className="flex-1 min-w-0 px-1">
                                        <div className={`relative rounded-xl border px-3 py-3 transition-colors duration-300 ${
                                            isFailed    ? 'border-rose-200 dark:border-rose-800/40 bg-rose-50/50 dark:bg-rose-900/10' :
                                            isRunning   ? 'border-zinc-300 dark:border-zinc-600/50 bg-zinc-50 dark:bg-zinc-800/30 pipe-shimmer' :
                                            isCompleted ? 'border-emerald-200/60 dark:border-emerald-800/25 bg-emerald-50/30 dark:bg-emerald-900/10' :
                                                          'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                                        }`}>
                                            <h3 className={`text-[11px] font-semibold leading-snug mb-1 ${
                                                isPending ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-900 dark:text-zinc-100'
                                            }`}>
                                                {step.label || meta.label}
                                            </h3>
                                            <p className={`text-[10px] leading-relaxed ${
                                                isPending ? 'text-zinc-400 dark:text-zinc-600' : 'text-zinc-500 dark:text-zinc-400'
                                            }`}>
                                                {step.detail || meta.detail}
                                            </p>
                                            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                                                <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md ${
                                                    isFailed    ? 'text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/40' :
                                                    isRunning   ? 'text-zinc-900 dark:text-zinc-100 bg-zinc-200 dark:bg-zinc-700' :
                                                    isCompleted ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30' :
                                                                  'text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800'
                                                }`}>
                                                    {STATUS_LABELS[step.status]}
                                                </span>
                                                {isRunning && (
                                                    <div className="flex items-center gap-1">
                                                        <span className="blink-dot inline-block w-[4px] h-[4px] rounded-full bg-zinc-900 dark:bg-zinc-300" />
                                                        <span className="blink-dot inline-block w-[4px] h-[4px] rounded-full bg-zinc-900 dark:bg-zinc-300" />
                                                        <span className="blink-dot inline-block w-[4px] h-[4px] rounded-full bg-zinc-900 dark:bg-zinc-300" />
                                                        <span className="ml-0.5 text-[9px] font-medium text-zinc-700 dark:text-zinc-300">Processing</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Spacer matching connector width */}
                                    {!isLast && <div className="flex-shrink-0" style={{ width: 72 }} />}
                                </React.Fragment>
                            );
                        })}
                    </div>

                </div>
            </div>
        </div>
    );
}

function FindingCard({ finding, index }: { finding: SentinelFinding; index: number }) {
    const [expanded, setExpanded] = useState(false);
    const colors = severityColors[finding.severity] ?? severityColors.info;

    return (
        <div className={`rounded-xl border border-zinc-100 dark:border-zinc-800 overflow-hidden transition-all ${expanded ? 'ring-1 ring-indigo-500/20' : ''}`}>
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-start gap-3 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition text-left"
            >
                <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${colors.dot}`} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                            {finding.severity}
                        </span>
                        <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                            {finding.category}
                        </span>
                    </div>
                    <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mt-1.5">{finding.title}</h4>
                    {finding.filePath && (
                        <div className="flex items-center gap-1.5 mt-1">
                            <FileCode size={11} className="text-zinc-400" />
                            <span className="text-[11px] font-mono text-zinc-400">
                                {finding.filePath}{finding.startLine ? `:${finding.startLine}` : ''}
                            </span>
                        </div>
                    )}
                </div>
                <div className="shrink-0 mt-1">
                    {expanded ? <ChevronUp size={14} className="text-zinc-400" /> : <ChevronDown size={14} className="text-zinc-400" />}
                </div>
            </button>

            {expanded && (
                <div className="px-4 pb-4 border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-4">
                    <div>
                        <h5 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">What's Wrong</h5>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{finding.description}</p>
                    </div>
                    {finding.mentorExplanation && (
                        <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30 rounded-lg p-3">
                            <h5 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1.5">Why This Matters</h5>
                            <p className="text-sm text-indigo-800 dark:text-indigo-300 leading-relaxed">{finding.mentorExplanation}</p>
                        </div>
                    )}
                    {finding.suggestedFix && (
                        <div>
                            <h5 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Suggested Fix</h5>
                            <pre className="font-mono text-xs bg-zinc-950 text-emerald-400 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap border border-zinc-800">
                                {finding.suggestedFix}
                            </pre>
                        </div>
                    )}
                    {finding.estimatedFixEffort && (
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <Zap size={12} /> Estimated effort: <strong>{finding.estimatedFixEffort}</strong>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function InfrastructurePlanView({
    title,
    plan,
}: {
    title: string;
    plan: InfrastructurePlan;
}) {
    return (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/70 border-b border-zinc-100 dark:border-zinc-700">
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 uppercase tracking-wide">{title}</h3>
            </div>
            <div className="p-4 space-y-5">
                {plan.architectureNotes && (
                    <div className="bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
                        <h4 className="text-xs font-bold text-zinc-600 dark:text-zinc-300 mb-1 uppercase tracking-wide">Architecture Analysis</h4>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">{plan.architectureNotes}</p>
                    </div>
                )}

                {plan.impactSummary && plan.impactSummary.length > 0 && (
                    <div>
                        <h4 className="text-xs font-bold text-zinc-600 dark:text-zinc-300 mb-2 uppercase tracking-wide">Projected Impact Summary</h4>
                        <div className="space-y-2">
                            {plan.impactSummary.map((item, idx) => (
                                <div key={idx} className="text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800 rounded-lg px-3 py-2">
                                    {item}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {plan.detectedPatterns?.length > 0 && (
                    <div>
                        <h4 className="text-xs font-bold text-zinc-600 dark:text-zinc-300 mb-2 uppercase tracking-wide">Detected AWS Resources</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {plan.detectedPatterns.map((pattern: any, idx: number) => (
                                <div key={idx} className="p-3 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-100 dark:border-zinc-700 flex justify-between items-center">
                                    <div>
                                        <span className="text-sm text-zinc-800 dark:text-zinc-200 font-medium">{pattern.service ?? pattern.resourceType ?? pattern.name ?? 'Unknown'}</span>
                                        {pattern.detectedInFile && (
                                            <div className="text-[11px] font-mono text-zinc-400 mt-0.5">{pattern.detectedInFile}</div>
                                        )}
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-md font-bold uppercase tracking-wider ${pattern.isNew ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
                                        {pattern.isNew ? 'NEW' : 'EXISTING'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {(plan.costForecast || plan.costProjection || plan.confidenceScore != null) && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800/30 p-4">
                        <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-3 uppercase tracking-wide">Cost Forecast</h4>
                        {plan.costForecast && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                                        ${(plan.costForecast.totalMonthlyCostUsd ?? 0).toFixed(2)}
                                    </div>
                                    <div className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">Estimated Monthly</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                                        ${(plan.costForecast.totalYearlyCostUsd ?? 0).toFixed(2)}
                                    </div>
                                    <div className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">Estimated Yearly</div>
                                </div>
                            </div>
                        )}
                        {plan.costProjection && (
                            <div className="mt-3 text-xs text-emerald-700 dark:text-emerald-400">
                                Projection: <strong>{plan.costProjection}</strong>
                            </div>
                        )}
                        {plan.costForecast?.confidence && (
                            <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-500">
                                Confidence: <strong>{plan.costForecast.confidence}</strong>
                            </div>
                        )}
                        {plan.confidenceScore != null && (
                            <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-500">
                                Model confidence score: <strong>{plan.confidenceScore}%</strong>
                            </div>
                        )}
                    </div>
                )}

                {plan.terraformCode && (
                    <div>
                        <h4 className="text-xs font-bold text-zinc-600 dark:text-zinc-300 mb-2 uppercase tracking-wide">Generated Terraform</h4>
                        <pre className="font-mono text-sm bg-zinc-950 text-emerald-400 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-[320px] overflow-y-auto border border-zinc-800">
                            {plan.terraformCode}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
}

export function AutomationReportPage() {
    const { id = '' } = useParams();
    const navigate = useNavigate();
    const [report, setReport] = useState<AutomationReportData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isRestarting, setIsRestarting] = useState(false);
    const [repoName, setRepoName] = useState<string>('');
    const { start } = useTutorial();

    // Auto-launch automation report tutorial on first visit
    useEffect(() => {
        const completed = localStorage.getItem(AUTOMATION_TUTORIAL_KEY);
        if (!completed) {
            const timer = setTimeout(() => start(AUTOMATION_STEPS, AUTOMATION_TUTORIAL_KEY), 900);
            return () => clearTimeout(timer);
        }
    }, [start]);

    const fetchReport = useCallback(async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/repos/${id}/automation-report`, {
                credentials: 'include'
            });
            if (!res.ok) {
                if (res.status === 401) {
                    setReport({ status: 'not_started', error: null, sentinel: null, fortress: null, infrastructure: null, progress: null, lastUpdatedAt: null });
                    setIsLoading(false);
                    return;
                }
                throw new Error(`HTTP ${res.status}`);
            }
            const data = await res.json();
            setReport({
                ...data,
                error: data.error ?? null,
                progress: data.progress ?? null,
            });
            setIsLoading(false);
        } catch (err: any) {
            setError(err.message || 'Error loading report');
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchReport();
        if (id) getRepo(id).then(r => setRepoName(r.name)).catch(() => {});
    }, [fetchReport, id]);

    const handleRestart = useCallback(async () => {
        if (!id || isRestarting) return;

        setIsRestarting(true);
        try {
            const res = await fetch(`${BACKEND_URL}/api/repos/${id}/trigger-automation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            setError(null);
            setReport({
                status: 'running',
                error: null,
                sentinel: null,
                fortress: null,
                infrastructure: null,
                progress: getFallbackProgress('running'),
                lastUpdatedAt: new Date().toISOString(),
            });
        } catch (err: any) {
            setError(err.message || 'Failed to restart automation');
        } finally {
            setIsRestarting(false);
        }
    }, [id, isRestarting]);

    // Auto-poll while pipeline is running
    useEffect(() => {
        if (report?.status === 'running') {
            const interval = setInterval(fetchReport, 3000);
            return () => clearInterval(interval);
        }
    }, [report?.status, fetchReport]);

    if (isLoading) {
        return (
            <div className="w-full min-h-screen bg-[#f6f7fb] dark:bg-[#0A0A0E] text-zinc-900 dark:text-slate-100 font-['JetBrains_Mono',_monospace]">
                <NavBar id={id} navigate={navigate} repoName={repoName} />
                <div className="flex items-center justify-center py-32">
                    <div className="w-6 h-6 rounded-full border-2 border-zinc-200 dark:border-zinc-700 border-t-indigo-500 animate-spin" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full min-h-screen flex flex-col items-center justify-center bg-[#f6f7fb] dark:bg-[#0A0A0E] gap-3">
                <AlertCircle className="w-7 h-7 text-rose-500" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">{error}</span>
                <button onClick={() => navigate(`/repo/${id}`)} className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
                    Back to Repository
                </button>
            </div>
        );
    }
    // Pipeline is running
    if (report?.status === 'running') {
        return (
            <div className="w-full min-h-screen bg-[#f6f7fb] dark:bg-[#0A0A0E] text-zinc-900 dark:text-slate-100 font-['JetBrains_Mono',_monospace]">
                <NavBar id={id} navigate={navigate} repoName={repoName} />
                <div className="w-full px-6 md:px-10 py-12 space-y-6">
                    <PipelineProgressPanel
                        status={report.status}
                        progress={report.progress}
                        title="Automation Pipeline Running"
                        subtitle="Live backend updates from Sentinel, Fortress, and Infrastructure agents."
                        lastUpdatedAt={report.lastUpdatedAt}
                    />
                    <div className="flex justify-end">
                        <button
                            onClick={handleRestart}
                            disabled={isRestarting}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-600 dark:text-zinc-400 text-sm font-medium transition"
                        >
                            <RotateCcw size={13} className={isRestarting ? 'animate-spin' : ''} />
                            {isRestarting ? 'Restarting...' : 'Restart'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (report?.status === 'failed') {
        return (
            <div className="w-full min-h-screen bg-[#f6f7fb] dark:bg-[#0A0A0E] text-zinc-900 dark:text-slate-100 font-['JetBrains_Mono',_monospace]">
                <NavBar id={id} navigate={navigate} repoName={repoName} />
                <div className="w-full px-6 md:px-10 py-12 space-y-6">
                    <PipelineProgressPanel
                        status={report.status}
                        progress={report.progress}
                        title="Automation Pipeline Failed"
                        subtitle="The run stopped before completion. Review the error and try again."
                        lastUpdatedAt={report.lastUpdatedAt}
                    />
                    <div className="rounded-xl border border-rose-200 dark:border-rose-800/50 bg-rose-50 dark:bg-rose-900/20 p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-rose-700 dark:text-rose-300 flex-1">
                            {report.error || 'Automation pipeline failed unexpectedly.'}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleRestart}
                            disabled={isRestarting}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition"
                        >
                            <RotateCcw size={14} className={isRestarting ? 'animate-spin' : ''} />
                            {isRestarting ? 'Restarting...' : 'Restart Pipeline'}
                        </button>
                        <button
                            onClick={() => navigate(`/repo/${id}`)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-medium transition"
                        >
                            Back to Repository
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // No data yet
    if (!report || report.status === 'not_started' || (!report.sentinel && !report.fortress && !report.infrastructure)) {
        return (
            <div className="w-full min-h-screen bg-[#f6f7fb] dark:bg-[#0A0A0E] text-zinc-900 dark:text-slate-100 font-['JetBrains_Mono',_monospace]">
                <style>{`
                    .cta-btn {
                      position: relative;
                      transition: transform 0.2s, box-shadow 0.2s;
                      overflow: visible;
                    }
                    .cta-btn:disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
                    .cta-btn:hover {
                      transform: translateY(-3px);
                      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
                    }
                    .cta-btn:active {
                      transform: translateY(-1px);
                      box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
                    }
                    .cta-btn::after {
                      content: '';
                      display: inline-block;
                      height: 100%;
                      width: 100%;
                      border-radius: inherit;
                      position: absolute;
                      top: 0; left: 0;
                      z-index: -1;
                      background-color: var(--cta-primary, #6366f1);
                      transition: transform 0.4s, opacity 0.4s;
                    }
                    .cta-btn:hover::after {
                      transform: scaleX(1.4) scaleY(1.6);
                      opacity: 0;
                    }
                    .cta-btn--blue::after  { background-color: var(--cta-primary, #6366f1); }
                    .cta-btn--violet::after { background-color: var(--cta-primary, #6366f1); }
                `}</style>
                <NavBar id={id} navigate={navigate} repoName={repoName} />
                <div className="max-w-3xl mx-auto px-6 py-20 flex flex-col items-center text-center gap-6">
                    <div className="w-20 h-20 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 flex items-center justify-center">
                        <Bot className="w-10 h-10 text-indigo-400" />
                    </div>
                    <h2 className="text-2xl font-bold">No automation report yet</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 max-w-md leading-relaxed">
                        The automation pipeline hasn't run for this repository yet. Go to <strong>Repository Settings</strong> and enable automation - the full pipeline (Sentinel review, Fortress test plan, Infrastructure prediction) will run automatically on the latest commit.
                    </p>
                    <button
                        onClick={() => navigate(`/repo/${id}/settings`)}
                        className="cta-btn cta-btn--blue mt-2 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition"
                        style={{ backgroundColor: 'var(--cta-primary, #6366f1)', color: 'var(--cta-text, #fff)' }}
                    >
                        Go to Settings -&gt; Enable Automation
                    </button>
                </div>
            </div>
        );
    }

    // Full report view
    return (
        <div className="w-full min-h-screen bg-[#f6f7fb] dark:bg-[#0A0A0E] text-zinc-900 dark:text-slate-100 font-['JetBrains_Mono',_monospace]">
            <style>{`
                /* CTA button lift + ripple animation */
                .cta-btn {
                  position: relative;
                  transition: transform 0.2s, box-shadow 0.2s;
                  overflow: visible;
                }
                .cta-btn:disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
                .cta-btn:hover {
                  transform: translateY(-3px);
                  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
                }
                .cta-btn:active {
                  transform: translateY(-1px);
                  box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
                }
                .cta-btn::after {
                  content: '';
                  display: inline-block;
                  height: 100%;
                  width: 100%;
                  border-radius: inherit;
                  position: absolute;
                  top: 0; left: 0;
                  z-index: -1;
                  background-color: var(--cta-primary, #6366f1);
                  transition: transform 0.4s, opacity 0.4s;
                }
                .cta-btn:hover::after {
                  transform: scaleX(1.4) scaleY(1.6);
                  opacity: 0;
                }
                .cta-btn--blue::after  { background-color: var(--cta-primary, #6366f1); }
                .cta-btn--violet::after { background-color: var(--cta-primary, #6366f1); }
            `}</style>
            <NavBar id={id} navigate={navigate} repoName={repoName} />

            <div className="max-w-5xl mx-auto px-6 md:px-10 py-10">
                <div className="flex items-start justify-between mb-10">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Automation Report</h1>
                        <p className="text-zinc-500 dark:text-zinc-400">
                            Comprehensive AI-driven analysis of your repository by Sentinel, Fortress, and Infrastructure agents.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            id="automation-restart-btn"
                            onClick={handleRestart}
                            disabled={isRestarting}
                            className="cta-btn inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
                            style={{ backgroundColor: 'var(--cta-primary)', color: 'var(--cta-text)' }}
                        >
                            <RotateCcw size={14} className={isRestarting ? 'animate-spin' : ''} />
                            {isRestarting ? 'Restarting...' : 'Restart'}
                        </button>
                        {report.lastUpdatedAt && (
                            <div className="text-xs font-medium text-zinc-400 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800">
                                {new Date(report.lastUpdatedAt).toLocaleString()}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-8">
                    {/* SENTINEL REVIEW */}
                    <div id="automation-sentinel-card" className={`${cardCls} rounded-2xl overflow-hidden`}>
                        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-indigo-50/30 dark:bg-indigo-900/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                                    <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Sentinel Deep Review</h2>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Security, logic, scalability, and architecture analysis</p>
                                </div>
                            </div>
                            {report.sentinel && (
                                <div className="flex items-center gap-3">
                                    <div className="px-3 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-bold shadow-sm">
                                        Risk: <span className={riskColors[report.sentinel.overallRisk] ?? 'text-zinc-500'}>{report.sentinel.overallRisk?.toUpperCase()}</span>
                                    </div>
                                    <div className="px-3 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-bold shadow-sm">
                                        {report.sentinel.totalFindings} findings
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6">
                            {report.sentinel ? (
                                <div>
                                    {/* Executive Summary */}
                                    <div className="mb-6">
                                        <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2 uppercase tracking-wide">Executive Summary</h3>
                                        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                            {report.sentinel.summary}
                                        </p>
                                    </div>

                                    {/* Stats row */}
                                    <div className="grid grid-cols-3 gap-4 mb-6">
                                        {[
                                            { label: 'Critical', count: report.sentinel.criticalFindings, color: 'text-rose-500 bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800/30' },
                                            { label: 'High', count: report.sentinel.highFindings, color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800/30' },
                                            { label: 'Total', count: report.sentinel.totalFindings, color: 'text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700' },
                                        ].map(({ label, count, color }) => (
                                            <div key={label} className={`rounded-xl border p-4 text-center ${color}`}>
                                                <div className="text-2xl font-bold">{count}</div>
                                                <div className="text-xs font-medium mt-1 opacity-70">{label}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Prioritized Actions */}
                                    {report.sentinel.prioritizedActionItems?.length > 0 && (
                                        <div className="mb-6">
                                            <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-3 uppercase tracking-wide">Priority Actions</h3>
                                            <div className="space-y-2">
                                                {report.sentinel.prioritizedActionItems.map((action, idx) => (
                                                    <div key={idx} className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-100 dark:border-amber-800/30">
                                                        <div className="w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-800/50 flex items-center justify-center shrink-0 text-[10px] font-bold text-amber-800 dark:text-amber-300 mt-0.5">{idx + 1}</div>
                                                        <p className="text-sm text-amber-900 dark:text-amber-200">{action}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Findings */}
                                    {report.sentinel.findings?.length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-3 uppercase tracking-wide">All Findings</h3>
                                            <div className="space-y-3">
                                                {report.sentinel.findings.map((finding, idx) => (
                                                    <FindingCard key={idx} finding={finding} index={idx} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-zinc-500 dark:text-zinc-400 text-sm">
                                    Sentinel review did not produce results for this repository.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* FORTRESS TEST PLAN */}
                    <div id="automation-fortress-card" className={`${cardCls} rounded-2xl overflow-hidden`}>
                        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-blue-50/30 dark:bg-blue-900/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                                    <TestTube2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Fortress QA Test Plan</h2>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">BDD test plan with edge cases and security considerations</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6">
                            {report.fortress?.testPlanText ? (
                                <div className="font-mono text-sm bg-zinc-950 text-emerald-400 p-5 rounded-xl border border-zinc-800 overflow-x-auto whitespace-pre-wrap max-h-[600px] overflow-y-auto">
                                    {report.fortress.testPlanText}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-zinc-500 dark:text-zinc-400 text-sm">
                                    No Fortress test plan data available yet.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* INFRASTRUCTURE PREDICTION */}
                    <div id="automation-infra-card" className={`${cardCls} rounded-2xl overflow-hidden`}>
                        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-amber-50/30 dark:bg-amber-900/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                                    <Cloud className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Infrastructure Prediction</h2>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">AI-forecasted architecture, resources, and cost projection</p>
                                </div>
                            </div>
                            {report.infrastructure?.hasInfraChanges && (
                                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2.5 py-1 rounded-full uppercase tracking-wider">Changes Detected</span>
                            )}
                        </div>

                        <div className="p-6">
                            {report.infrastructure ? (
                                <div className="space-y-6">
                                    {(report.infrastructure.plans?.beforeChanges || report.infrastructure.plans?.afterSentinelChanges) ? (
                                        <>
                                            {report.infrastructure.plans?.beforeChanges && (
                                                <InfrastructurePlanView
                                                    title="Before Changes"
                                                    plan={report.infrastructure.plans.beforeChanges}
                                                />
                                            )}
                                            {report.infrastructure.plans?.afterSentinelChanges ? (
                                                <InfrastructurePlanView
                                                    title="After Sentinel Changes"
                                                    plan={report.infrastructure.plans.afterSentinelChanges}
                                                />
                                            ) : (
                                                <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 px-4 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                                                    {report.sentinel && (report.sentinel.totalFindings ?? 0) === 0
                                                        ? 'No Sentinel findings — code appears clean, so no post-fix infrastructure projection is needed.'
                                                        : report.sentinel === null
                                                        ? 'Sentinel analysis did not complete, so the projected infrastructure plan could not be generated. Check that DeepSeek is properly configured in your environment.'
                                                        : 'A projected post-Sentinel infrastructure plan was not generated for this run.'}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            {report.infrastructure.architectureNotes && (
                                                <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                                    <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2 uppercase tracking-wide">Architecture Analysis</h3>
                                                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                                                        {report.infrastructure.architectureNotes}
                                                    </p>
                                                </div>
                                            )}

                                            {report.infrastructure.detectedPatterns?.length > 0 && (
                                                <div>
                                                    <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-3 uppercase tracking-wide">Detected AWS Resources</h3>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {report.infrastructure.detectedPatterns.map((pattern: any, idx: number) => (
                                                            <div key={idx} className="p-3 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-100 dark:border-zinc-700 flex justify-between items-center">
                                                                <div>
                                                                    <span className="text-sm text-zinc-800 dark:text-zinc-200 font-medium">{pattern.service ?? pattern.resourceType ?? pattern.name ?? 'Unknown'}</span>
                                                                    {pattern.detectedInFile && (
                                                                        <div className="text-[11px] font-mono text-zinc-400 mt-0.5">{pattern.detectedInFile}</div>
                                                                    )}
                                                                </div>
                                                                <span className={`text-xs px-2 py-1 rounded-md font-bold uppercase tracking-wider ${pattern.isNew ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
                                                                    {pattern.isNew ? 'NEW' : 'EXISTING'}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {report.infrastructure.costForecast && (
                                                <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800/30 p-4">
                                                    <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mb-3 uppercase tracking-wide">Cost Forecast</h3>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                                                                ${(report.infrastructure.costForecast.totalMonthlyCostUsd ?? 0).toFixed(2)}
                                                            </div>
                                                            <div className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">Estimated Monthly</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                                                                ${(report.infrastructure.costForecast.totalYearlyCostUsd ?? 0).toFixed(2)}
                                                            </div>
                                                            <div className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">Estimated Yearly</div>
                                                        </div>
                                                    </div>
                                                    {report.infrastructure.costForecast.confidence && (
                                                        <div className="mt-3 text-xs text-emerald-600 dark:text-emerald-500">
                                                            Confidence: <strong>{report.infrastructure.costForecast.confidence}</strong>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {report.infrastructure.terraformCode && (
                                                <div>
                                                    <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2 uppercase tracking-wide">Generated Terraform</h3>
                                                    <pre className="font-mono text-sm bg-zinc-950 text-emerald-400 p-5 rounded-xl border border-zinc-800 overflow-x-auto whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                                                        {report.infrastructure.terraformCode}
                                                    </pre>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-zinc-500 dark:text-zinc-400 text-sm">
                                    Infrastructure prediction did not produce results for this repository.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Shared navbar component
function NavBar({ id, navigate, repoName }: { id: string; navigate: (path: string) => void; repoName?: string }) {
    const { isDarkMode, setIsDarkMode } = useTheme();
    const { start } = useTutorial();
    return (
        <div className="flex-none z-50 border-b border-zinc-200 dark:border-slate-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl sticky top-0 px-6 h-[60px] flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate(`/repo/${id}`)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                >
                    <ChevronLeft size={16} className="text-zinc-600 dark:text-zinc-300" />
                </button>
                <div className="flex items-center gap-2 text-sm ml-2">
                    <span className="text-zinc-500 dark:text-slate-400 cursor-pointer hover:text-zinc-800 dark:hover:text-slate-200 transition-colors" onClick={() => navigate(`/repo/${id}`)}>
                        {repoName || 'Repository'}
                    </span>
                    <span className="text-zinc-300 dark:text-slate-700">/</span>
                    <span className="font-semibold text-zinc-900 dark:text-slate-100">Automation Report</span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500 dark:text-slate-400"
                >
                    {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </button>
                <AppNavbarProfile
                    onTutorial={() => {
                        localStorage.removeItem(AUTOMATION_TUTORIAL_KEY);
                        setTimeout(() => start(AUTOMATION_STEPS, AUTOMATION_TUTORIAL_KEY), 80);
                    }}
                />
            </div>
        </div>
    );
}
