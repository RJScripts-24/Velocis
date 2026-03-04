import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Bot, Shield, TestTube2, Cloud, ChevronLeft, Check, AlertTriangle } from 'lucide-react';

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

    const [automatedServices, setAutomatedServices] = useState<string[]>([]);
    const [popupService, setPopupService] = useState<AutomateOption | null>(null);
    const [confirmText, setConfirmText] = useState('');

    const handleAutomateClick = (opt: AutomateOption) => {
        setPopupService(opt);
        setConfirmText('');
    };

    const handleConfirm = () => {
        if (confirmText.toLowerCase() === 'confirm' && popupService) {
            setAutomatedServices([...automatedServices, popupService.id]);
            setPopupService(null);
        }
    };

    return (
        <div className="w-full min-h-screen bg-[#f6f7fb] dark:bg-[#0A0A0E] text-zinc-900 dark:text-slate-100 font-['Geist_Sans',_'Inter',_sans-serif]">
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
            </div>

            <div className="max-w-4xl mx-auto px-6 md:px-10 py-10">
                <h1 className="text-3xl font-bold mb-2">Repository Settings</h1>
                <p className="text-zinc-500 dark:text-zinc-400 mb-8">Manage integrations, automations, and repository-specific behavior.</p>

                <div className={`${cardCls} rounded-2xl overflow-hidden p-6`}>
                    <h2 className="text-lg font-semibold mb-1">Automation</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">Configure AI agents to automatically handle repository operations.</p>

                    <div className="flex flex-col gap-4">
                        {automationOptions.map(opt => {
                            const isAutomated = automatedServices.includes(opt.id);
                            return (
                                <div key={opt.id} className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-700/50">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                                            style={{ backgroundColor: `${opt.accentColor}15`, border: `1px solid ${opt.accentColor}30` }}
                                        >
                                            <opt.icon className="w-5 h-5" style={{ color: opt.accentColor }} />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-zinc-900 dark:text-white">{opt.name}</div>
                                            <div className="text-xs text-zinc-500 dark:text-zinc-400">{opt.description}</div>
                                        </div>
                                    </div>
                                    <div>
                                        {isAutomated ? (
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/30 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                                                <Check size={16} /> Activated
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleAutomateClick(opt)}
                                                className="px-6 py-2.5 rounded-[10px] font-medium text-[14px] transition-all hover:shadow-lg"
                                                style={{ backgroundColor: 'var(--cta-primary)', color: 'var(--cta-text)' }}
                                            >
                                                Automate
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {popupService && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm p-4">
                    <div className={`${cardCls} w-full max-w-md rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200`}>
                        <div className="flex items-start gap-4 mb-5">
                            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Confirm Automation</h3>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                                    You are about to allow <strong>{popupService.name}</strong> to make automatic changes to this repository. This action cannot be easily undone.
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
                                onClick={() => setPopupService(null)}
                                className="px-4 py-2 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={confirmText.toLowerCase() !== 'confirm'}
                                className="px-6 py-2.5 rounded-[10px] font-medium text-[14px] transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ backgroundColor: 'var(--cta-primary)', color: 'var(--cta-text)' }}
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
