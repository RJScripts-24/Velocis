import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Bot, Shield, TestTube2, Cloud, ChevronLeft, Check, AlertTriangle, X } from 'lucide-react';
import lightLogoImg from '../../../LightLogo.png';
import darkLogoImg from '../../../DarkLogo.png';

const cardCls = [
    "bg-white dark:bg-zinc-900",
    "border border-[rgba(16,24,40,0.06)] dark:border-zinc-800",
    "shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_rgba(16,24,40,0.06)]",
    "ring-1 ring-inset ring-black/5 dark:ring-white/10",
].join(" ");

interface AutomateOption {
    id: string;
    name: string;
    description: string;
    icon: React.ElementType;
    accentColor: string;
}

const automationOptions: AutomateOption[] = [
    { id: 'cortex', name: 'Cortex automation', description: 'Enable automatic live tracing and visual cortex generation.', icon: Bot, accentColor: '#10b981' },
    { id: 'sentinel', name: 'Sentinel automation', description: 'Automatically scan PRs for risks and anomalies.', icon: Shield, accentColor: '#6366f1' },
    { id: 'fortress', name: 'Fortress automation', description: 'Automated QA pipeline and test suite execution.', icon: TestTube2, accentColor: '#3b82f6' },
    { id: 'infrastructure', name: 'Infrastructure automation', description: 'Auto-scaling and infrastructure drift prevention.', icon: Cloud, accentColor: '#f59e0b' },
];

export function RepositorySettingsPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [isAutomated, setIsAutomated] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [loading, setLoading] = useState(true);

    const BACKEND = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}`;

    useEffect(() => {
        // Fetch existing setting from dedicated settings endpoint
        // The server uses session cookie (velocis_session) for auth
        fetch(`${BACKEND}/api/repos/${id}/settings`, {
            credentials: 'include'
        })
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(data => {
                if (data && data.isAutomated !== undefined) {
                    setIsAutomated(data.isAutomated);
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [id]);  // eslint-disable-line react-hooks/exhaustive-deps

    const saveSetting = async (automated: boolean): Promise<void> => {
        try {
            await fetch(`${BACKEND}/api/repos/${id}/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ isAutomated: automated })
            });
        } catch (e) {
            console.error('Failed to save automation setting:', e);
        }
    };

    // When automation is first enabled, immediately trigger the pipeline on the latest commit
    const triggerAutomationPipeline = async (): Promise<void> => {
        try {
            await fetch(`${BACKEND}/api/repos/${id}/trigger-automation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });
        } catch (e) {
            console.error('Failed to trigger automation pipeline:', e);
        }
    };

    const handleAutomateToggle = () => {
        if (!isAutomated) {
            setShowConfirm(true);
            setConfirmText('');
        } else {
            setIsAutomated(false);
            saveSetting(false);
        }
    };

    const handleConfirm = () => {
        if (confirmText.toLowerCase() === 'confirm') {
            setIsAutomated(true);
            saveSetting(true);
            // Trigger the full automation pipeline on the latest commit immediately
            triggerAutomationPipeline();
            setShowConfirm(false);
        }
    };

    return (
        <div className="w-full min-h-screen bg-[#f6f7fb] dark:bg-[#0A0A0E] text-zinc-900 dark:text-slate-100 font-['JetBrains_Mono',_monospace]">
            {/* NAVBAR */}
            <div className="flex-none z-50 border-b border-zinc-200 dark:border-slate-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl sticky top-0 px-6 h-[60px] flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(`/repo/${id}`)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                    >
                        <ChevronLeft size={16} className="text-zinc-600 dark:text-zinc-300" />
                    </button>
                    <div className="flex items-center gap-2 text-sm ml-2">
                        <span
                            className="text-zinc-500 dark:text-slate-400 cursor-pointer hover:text-zinc-800 dark:hover:text-slate-200 transition-colors"
                            onClick={() => navigate(`/repo/${id}`)}
                        >
                            Repository
                        </span>
                        <span className="text-zinc-300 dark:text-slate-700">/</span>
                        <span className="font-semibold text-zinc-900 dark:text-slate-100">Settings</span>
                    </div>
                </div>
                <img src={typeof window !== 'undefined' && (document.documentElement.classList.contains('dark') || window.matchMedia('(prefers-color-scheme: dark)').matches) ? darkLogoImg : lightLogoImg} alt="Velocis" className="h-7 w-auto object-contain" />
            </div>

            <div className="max-w-4xl mx-auto px-6 md:px-10 py-10">
                <h1 className="text-3xl font-bold mb-2">Repository Settings</h1>
                <p className="text-zinc-500 dark:text-zinc-400 mb-8">Manage integrations, automations, and repository-specific behavior.</p>

                <div className={`${cardCls} rounded-2xl overflow-hidden p-8 mb-8`}>
                    <div className="flex items-start justify-between mb-8">
                        <div>
                            <h2 className="text-xl font-bold mb-2">Autonomous Repository Engine</h2>
                            <p className="text-zinc-500 dark:text-zinc-400 max-w-xl">
                                Enable the full Velocis suite to autonomously manage your repository lifecycle from code push to infrastructure deployment.
                            </p>
                        </div>
                        {isAutomated ? (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/30">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Automation Active</span>
                                </div>
                                <button
                                    onClick={handleAutomateToggle}
                                    disabled={loading}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm border border-rose-200 dark:border-rose-800/50 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                                >
                                    <X size={15} />
                                    Disable Automation
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleAutomateToggle}
                                disabled={loading}
                                className="px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-sm bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 disabled:opacity-50"
                            >
                                {loading ? 'Loading...' : 'Enable Automation'}
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8 border-y border-zinc-100 dark:border-zinc-800">
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Automation Workflow</h3>
                            <div className="space-y-6">
                                <div className="flex gap-4">
                                    <div className="mt-1 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">1</div>
                                    <div>
                                        <div className="font-bold text-sm">Cortex Trace Integration</div>
                                        <p className="text-xs text-zinc-500 mt-1 leading-relaxed">Continuous live tracing and visual mapping of service dependencies and runtime behavior.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="mt-1 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">2</div>
                                    <div>
                                        <div className="font-bold text-sm">Sentinel Code Guard</div>
                                        <p className="text-xs text-zinc-500 mt-1 leading-relaxed">Real-time risk assessment and security scanning of every commit pushed to the repository.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="mt-1 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">3</div>
                                    <div>
                                        <div className="font-bold text-sm">Fortress QA Shield</div>
                                        <p className="text-xs text-zinc-500 mt-1 leading-relaxed">AI-driven test plan generation and autonomous execution for comprehensive quality assurance.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Technical Specifications</h3>
                            <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-xl p-5 border border-zinc-100 dark:border-zinc-700/50">
                                <div className="flex items-center gap-2 mb-3">
                                    <Shield size={14} className="text-indigo-500" />
                                    <span className="text-xs font-bold">Execution Pipeline</span>
                                </div>
                                <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 italic">
                                    "When a push event is detected via GitHub Webhooks, the <strong>Sentinel</strong> agent initiates a deep-code review.
                                    Simultaneously, <strong>Fortress</strong> synthetically generates a multi-dimensional test plan based on the discovered risk vectors.
                                    Upon validation of all test cases, the system triggers the <strong>Infrastructure Predictor</strong> to forecast and provision required resources for the next environment state."
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex items-center gap-2 text-[11px] text-zinc-400">
                        <AlertTriangle size={14} className="text-amber-500" />
                        <span>Enabling automation grants Velocis permission to write code, manage PRs, and provision cloud infrastructure.</span>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm p-4">
                    <div className={`${cardCls} w-full max-w-md rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200`}>
                        <div className="flex items-start gap-4 mb-5">
                            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Confirm Global Automation</h3>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                                    You are enabling the full autonomous suite for this repository. This allows our agents to perform automated testing, code reviews, and infrastructure changes.
                                </p>
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                Type <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-zinc-900 dark:text-white">confirm</span> to proceed:
                            </label>
                            <input
                                type="text"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder="confirm"
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:text-white transition"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleConfirm();
                                }}
                            />
                        </div>

                        <div className="flex gap-3 justify-end border-t border-zinc-100 dark:border-zinc-800 pt-4 mt-2">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="px-4 py-2 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={confirmText.toLowerCase() !== 'confirm'}
                                className="px-6 py-2.5 rounded-[10px] font-medium text-white transition-all bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Confirm Setup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
