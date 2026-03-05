import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ChevronLeft, Shield, TestTube2, Cloud, AlertCircle, Loader2, Bot, ChevronDown, ChevronUp, FileCode, Zap, RotateCcw } from 'lucide-react';

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
    lastUpdatedAt: string | null;
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
                            <h5 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1.5">💡 Why This Matters</h5>
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

    const fetchReport = useCallback(async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/repos/${id}/automation-report`, {
                credentials: 'include'
            });
            if (!res.ok) {
                if (res.status === 401) {
                    setReport({ status: 'not_started', sentinel: null, fortress: null, infrastructure: null, lastUpdatedAt: null });
                    setIsLoading(false);
                    return;
                }
                throw new Error(`HTTP ${res.status}`);
            }
            const data = await res.json();
            setReport(data);
            setIsLoading(false);
        } catch (err: any) {
            setError(err.message || 'Error loading report');
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

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
                sentinel: null,
                fortress: null,
                infrastructure: null,
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
            const interval = setInterval(fetchReport, 8000);
            return () => clearInterval(interval);
        }
    }, [report?.status, fetchReport]);

    if (isLoading) {
        return (
            <div className="w-full min-h-screen flex flex-col items-center justify-center bg-[#f6f7fb] dark:bg-[#0A0A0E] gap-3">
                <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
                <span className="text-sm text-zinc-400">Loading automation report...</span>
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
                <NavBar id={id} navigate={navigate} />
                <div className="max-w-3xl mx-auto px-6 py-20 flex flex-col items-center text-center gap-6">
                    <div className="w-20 h-20 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 flex items-center justify-center">
                        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
                    </div>
                    <h2 className="text-2xl font-bold">Automation Pipeline Running</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 max-w-md leading-relaxed">
                        The Sentinel, Fortress, and Infrastructure agents are analyzing your full repository. This typically takes 30–90 seconds. This page will refresh automatically.
                    </p>
                    <div className="flex gap-6 mt-4">
                        {[{ icon: Shield, label: 'Sentinel', color: 'text-indigo-500' }, { icon: TestTube2, label: 'Fortress', color: 'text-blue-500' }, { icon: Cloud, label: 'Infrastructure', color: 'text-amber-500' }].map(({ icon: Icon, label, color }) => (
                            <div key={label} className="flex flex-col items-center gap-2">
                                <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center animate-pulse">
                                    <Icon className={`w-5 h-5 ${color}`} />
                                </div>
                                <span className="text-xs font-medium text-zinc-500">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // No data yet
    if (!report || report.status === 'not_started' || (!report.sentinel && !report.fortress && !report.infrastructure)) {
        return (
            <div className="w-full min-h-screen bg-[#f6f7fb] dark:bg-[#0A0A0E] text-zinc-900 dark:text-slate-100 font-['JetBrains_Mono',_monospace]">
                <NavBar id={id} navigate={navigate} />
                <div className="max-w-3xl mx-auto px-6 py-20 flex flex-col items-center text-center gap-6">
                    <div className="w-20 h-20 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 flex items-center justify-center">
                        <Bot className="w-10 h-10 text-indigo-400" />
                    </div>
                    <h2 className="text-2xl font-bold">No automation report yet</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 max-w-md leading-relaxed">
                        The automation pipeline hasn't run for this repository yet. Go to <strong>Repository Settings</strong> and enable automation — the full pipeline (Sentinel review, Fortress test plan, Infrastructure prediction) will run automatically on the latest commit.
                    </p>
                    <button onClick={() => navigate(`/repo/${id}/settings`)} className="mt-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
                        Go to Settings → Enable Automation
                    </button>
                </div>
            </div>
        );
    }

    // Full report view
    return (
        <div className="w-full min-h-screen bg-[#f6f7fb] dark:bg-[#0A0A0E] text-zinc-900 dark:text-slate-100 font-['JetBrains_Mono',_monospace]">
            <style>{`
                /* ─── CTA Button – lift + ripple-after animation ─── */
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
            <NavBar id={id} navigate={navigate} />

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
                    {/* ── SENTINEL REVIEW ────────────────────────────────── */}
                    <div className={`${cardCls} rounded-2xl overflow-hidden`}>
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

                    {/* ── FORTRESS TEST PLAN ─────────────────────────────── */}
                    <div className={`${cardCls} rounded-2xl overflow-hidden`}>
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

                    {/* ── INFRASTRUCTURE PREDICTION ──────────────────────── */}
                    <div className={`${cardCls} rounded-2xl overflow-hidden`}>
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
                                                    A projected post-Sentinel infrastructure plan was not generated for this run.
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
function NavBar({ id, navigate }: { id: string; navigate: (path: string) => void }) {
    return (
        <div className="flex-none z-50 border-b border-zinc-200 dark:border-slate-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl sticky top-0 px-6 h-[60px] flex items-center">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate(`/repo/${id}`)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                >
                    <ChevronLeft size={16} className="text-zinc-600 dark:text-zinc-300" />
                </button>
                <div className="flex items-center gap-2 text-sm ml-2">
                    <span className="text-zinc-500 dark:text-slate-400 cursor-pointer hover:text-zinc-800 dark:hover:text-slate-200 transition-colors" onClick={() => navigate(`/repo/${id}`)}>
                        Repository
                    </span>
                    <span className="text-zinc-300 dark:text-slate-700">/</span>
                    <span className="font-semibold text-zinc-900 dark:text-slate-100">Automation Report</span>
                </div>
            </div>
        </div>
    );
}
