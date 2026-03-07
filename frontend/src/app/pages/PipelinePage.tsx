"use client";

import { useState, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'motion/react';
import {
  AlertCircle, Sun, Moon, Shield, Home, Folder, Sparkles, RefreshCw,
  BookOpen, Copy, Check, FileText,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { useTheme } from '../../lib/theme';
import { getRepo } from '../../lib/api';
import { useTutorial, PIPELINE_TUTORIAL_KEY, PIPELINE_STEPS } from '../../lib/tutorial';
import lightLogoImg from '../../../LightLogo.png';
import darkLogoImg from '../../../DarkLogo.png';
import { AppNavbarProfile } from '../components/AppNavbarProfile';

// ─── Live Pipeline Workflow ───────────────────────────────────────────────────
function LivePipelineWorkflow({ isDarkMode }: { isDarkMode: boolean }) {
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const steps = [
    { id: 1, label: "Ingesting Code" },
    { id: 2, label: "Analyzing Logic" },
    { id: 3, label: "Finding Edge Cases" },
    { id: 4, label: "Drafting Test Plan" },
  ];

  return (
    <div className={`relative w-full py-10 px-6 rounded-2xl shadow-xl overflow-hidden mb-6 transition-colors duration-300 ${isDarkMode ? 'bg-[#0a0f1c] border border-slate-800/80 shadow-2xl' : 'bg-white border border-gray-200'
      }`}>
      {/* Subtle radial-gradient vignette */}
      <div
        className="absolute inset-0 pointer-events-none transition-colors duration-300"
        style={{
          background: isDarkMode
            ? 'radial-gradient(ellipse at center, rgba(59, 130, 246, 0.12) 0%, rgba(0, 0, 0, 0.4) 80%)'
            : 'radial-gradient(ellipse at center, rgba(59, 130, 246, 0.05) 0%, rgba(255, 255, 255, 0.8) 100%)'
        }}
      />

      <div className="relative z-10 flex items-start justify-between w-full max-w-3xl mx-auto">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isActive = currentStep === step.id;
          const isPending = currentStep < step.id;

          return (
            <div key={step.id} className="relative flex flex-col items-center flex-1">
              {/* Connecting line */}
              {index !== steps.length - 1 && (
                <div className={`absolute top-4 left-1/2 w-full h-[2px] -z-10 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800/80' : 'bg-gray-200'}`}>
                  <div
                    className={`h-full transition-all duration-700 ease-in-out ${isCompleted ? 'bg-green-500' : 'bg-transparent'}`}
                    style={{ width: isCompleted ? '100%' : '0%' }}
                  />
                </div>
              )}

              {/* Node Circle */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10 
                  ${isCompleted ? 'bg-green-500 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : ''}
                  ${isActive ? `animate-pulse ring-4 ${isDarkMode
                    ? 'bg-blue-900/60 border-blue-400 ring-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.6)]'
                    : 'bg-blue-50 border-blue-500 ring-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                    }` : ''}
                  ${isPending ? (isDarkMode ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300') : ''}
                `}
              >
                {isCompleted && <Check className="w-4 h-4 text-white" />}
                {isActive && <div className={`w-2.5 h-2.5 rounded-full ${isDarkMode ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]' : 'bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]'}`} />}
              </div>

              {/* Label */}
              <span
                className={`mt-4 text-[11px] sm:text-xs font-semibold text-center transition-colors duration-300 px-1 tracking-wide
                  ${isCompleted ? 'text-green-500' : ''}
                  ${isActive ? (isDarkMode ? 'text-blue-300' : 'text-blue-700') : ''}
                  ${isPending ? (isDarkMode ? 'text-slate-500' : 'text-gray-400') : ''}
                `}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── PipelinePage ─────────────────────────────────────────────────────────────
export function PipelinePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { isDarkMode, setIsDarkMode } = useTheme();
  const { start } = useTutorial();
  const themeClass = isDarkMode ? 'dark' : '';

  // Auto-launch pipeline tutorial on first visit
  useEffect(() => {
    const completed = localStorage.getItem(PIPELINE_TUTORIAL_KEY);
    if (!completed) {
      const timer = setTimeout(() => start(PIPELINE_STEPS, PIPELINE_TUTORIAL_KEY), 900);
      return () => clearTimeout(timer);
    }
  }, [start]);

  const [repoName, setRepoName] = useState<string>('');

  // ── Fortress QA Strategist ────────────────────────────────────────────────
  const [isFortressLoading, setIsFortressLoading] = useState(false);
  const [qaPlanMarkdown, setQaPlanMarkdown] = useState<string>('');
  const [qaError, setQaError] = useState<string | null>(null);
  const [filesAnalyzed, setFilesAnalyzed] = useState<string[]>([]);
  const [qaCopied, setQaCopied] = useState(false);

  // ── Restore cached Fortress data on mount ────────────────────────────────
  useEffect(() => {
    if (!id) return;
    getRepo(id).then(r => setRepoName(r.name)).catch(() => {});
    try {
      const cachedQA = localStorage.getItem(`velocis:fortress:qa:${id}`);
      if (cachedQA) {
        const parsed = JSON.parse(cachedQA);
        setQaPlanMarkdown(parsed.markdown ?? '');
        setFilesAnalyzed(parsed.files ?? []);
      }
      const cachedDocs = localStorage.getItem(`velocis:fortress:docs:${id}`);
      if (cachedDocs) {
        const parsed = JSON.parse(cachedDocs);
        setApiDocsMarkdown(parsed.markdown ?? '');
      }
    } catch { /* ignore corrupt cache */ }
  }, [id]);

  const fetchQAPlan = useCallback(async () => {
    if (isFortressLoading) return;
    setIsFortressLoading(true);
    setQaError(null);
    setQaPlanMarkdown('');
    setFilesAnalyzed([]);
    try {
      const BASE_URL = (import.meta.env.VITE_BACKEND_URL as string) ?? 'http://localhost:3001';
      const res = await fetch(`${BASE_URL}/api/fortress/qa-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ repoId: repoName }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.message ?? `Server returned ${res.status}`);
      }
      const data = await res.json();
      setQaPlanMarkdown(data.qaPlanMarkdown ?? '');
      setFilesAnalyzed(data.filesAnalyzed ?? []);
      // Cache to localStorage so it persists across navigation
      try {
        localStorage.setItem(`velocis:fortress:qa:${repoName}`, JSON.stringify({
          markdown: data.qaPlanMarkdown ?? '',
          files: data.filesAnalyzed ?? [],
          savedAt: new Date().toISOString(),
        }));
      } catch { /* storage full — ignore */ }
    } catch (err: any) {
      setQaError(err?.message ?? 'Failed to generate QA plan.');
    } finally {
      setIsFortressLoading(false);
    }
  }, [isFortressLoading, repoName]);

  const handleCopyQA = useCallback(async () => {
    if (!qaPlanMarkdown) return;
    await navigator.clipboard.writeText(qaPlanMarkdown);
    setQaCopied(true);
    setTimeout(() => setQaCopied(false), 2000);
  }, [qaPlanMarkdown]);

  // ── Fortress API Documenter ───────────────────────────────────────────────
  const [isDocsLoading, setIsDocsLoading] = useState(false);
  const [apiDocsMarkdown, setApiDocsMarkdown] = useState<string>('');
  const [docsError, setDocsError] = useState<string | null>(null);
  const [docsCopied, setDocsCopied] = useState(false);

  const fetchApiDocs = useCallback(async () => {
    if (isDocsLoading) return;
    setIsDocsLoading(true);
    setDocsError(null);
    setApiDocsMarkdown('');
    try {
      const BASE_URL = (import.meta.env.VITE_BACKEND_URL as string) ?? 'http://localhost:3001';
      const res = await fetch(`${BASE_URL}/api/fortress/api-docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ repoId: repoName }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.message ?? `Server returned ${res.status}`);
      }
      const data = await res.json();
      setApiDocsMarkdown(data.apiDocsMarkdown ?? '');
      // Cache to localStorage so it persists across navigation
      try {
        localStorage.setItem(`velocis:fortress:docs:${repoName}`, JSON.stringify({
          markdown: data.apiDocsMarkdown ?? '',
          savedAt: new Date().toISOString(),
        }));
      } catch { /* storage full — ignore */ }
    } catch (err: any) {
      setDocsError(err?.message ?? 'Failed to generate API documentation.');
    } finally {
      setIsDocsLoading(false);
    }
  }, [isDocsLoading, repoName]);

  const handleCopyDocs = useCallback(async () => {
    if (!apiDocsMarkdown) return;
    await navigator.clipboard.writeText(apiDocsMarkdown);
    setDocsCopied(true);
    setTimeout(() => setDocsCopied(false), 2000);
  }, [apiDocsMarkdown]);

  // ── Shared prose classes ──────────────────────────────────────────────────
  const proseClass = `
    prose prose-sm dark:prose-invert max-w-none
    prose-headings:text-gray-900 dark:prose-headings:text-white prose-headings:font-bold
    prose-h1:text-base prose-h2:text-sm prose-h3:text-xs
    prose-p:text-gray-600 dark:prose-p:text-slate-400 prose-p:text-xs prose-p:leading-relaxed
    prose-li:text-gray-600 dark:prose-li:text-slate-400 prose-li:text-xs
    prose-strong:text-gray-900 dark:prose-strong:text-white
    prose-code:text-blue-600 dark:prose-code:text-blue-400
    prose-code:bg-blue-50 dark:prose-code:bg-blue-500/10
    prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[11px]
    prose-blockquote:border-blue-400 prose-blockquote:text-gray-500 dark:prose-blockquote:text-slate-400
    prose-hr:border-gray-200 dark:prose-hr:border-slate-800
    prose-pre:bg-slate-100 dark:prose-pre:bg-slate-800/60 prose-pre:text-[11px]
  `.trim();

  return (
    <div className={`${themeClass} w-full h-screen`}>
      <style>{`
        /* ── CTA Button – lift + ripple-after animation ── */
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
          transition: transform 0.4s, opacity 0.4s;
        }
        .cta-btn:hover::after {
          transform: scaleX(1.4) scaleY(1.6);
          opacity: 0;
        }
        .cta-btn--blue::after  { background-color: var(--cta-primary, #6366f1); }
        .cta-btn--violet::after { background-color: var(--cta-primary, #6366f1); }
      `}</style>
      <div className="h-screen flex flex-col bg-slate-50 dark:bg-[#080d18] text-gray-900 dark:text-gray-100 transition-colors duration-300 font-['JetBrains_Mono',_monospace]">

        {/* ── Top Bar ── */}
        <div className="border-b h-[60px] flex items-center justify-between px-6 bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800 backdrop-blur-md shadow-sm z-20 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <img src={isDarkMode ? darkLogoImg : lightLogoImg} alt="Velocis" className="h-7 w-auto object-contain" />
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white transition-colors font-medium"
              >
                <Home className="w-3.5 h-3.5" /><span className="hidden sm:inline">Dashboard</span>
              </button>
              <span>/</span>
              <button
                onClick={() => navigate(`/repo/${id}`)}
                className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white transition-colors font-medium"
              >
                <Folder className="w-3.5 h-3.5" /><span className="hidden sm:inline">{repoName}</span>
              </button>
              <span>/</span>
              <span className="text-gray-900 dark:text-white font-semibold flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-orange-400" /> Fortress
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors hidden sm:block"
            >
              {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <AppNavbarProfile
              onTutorial={() => {
                localStorage.removeItem(PIPELINE_TUTORIAL_KEY);
                setTimeout(() => start(PIPELINE_STEPS, PIPELINE_TUTORIAL_KEY), 80);
              }}
            />
          </div>
        </div>

        {/* ── Sub-header ── */}
        <div id="pipeline-sub-header" className="shrink-0 px-6 py-3 border-b border-gray-100 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 backdrop-blur-sm flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-orange-500/10 border border-orange-500/30 shrink-0">
            <Shield className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 dark:text-white leading-none">Fortress Intelligence Suite</h1>
            <p className="text-[11px] text-gray-500 dark:text-slate-500 mt-0.5">
              Powered by <span className="font-semibold text-blue-400">DeepSeek V3</span> via Amazon Bedrock
              <span className="mx-1.5 text-gray-300 dark:text-slate-700">·</span>
              <span className="font-mono text-orange-400">{repoName}</span>
            </p>
          </div>
        </div>

        {/* ── Split panels ── */}
        <div className="flex-1 overflow-hidden flex">

          {/* ─── LEFT: QA Strategist ─────────────────────────────────────── */}
          <div id="pipeline-qa-panel" className="flex-1 overflow-auto border-r border-gray-200 dark:border-slate-800/70 flex flex-col">

            {/* Panel header */}
            <div className="sticky top-0 z-10 px-5 py-3.5 flex items-center justify-between border-b border-gray-100 dark:border-slate-800/60 bg-white/90 dark:bg-[#080d18]/90 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-500/10 border border-blue-500/30">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white">BDD Test Plan Generator</h3>
                  <p className="text-[10px] text-gray-500 dark:text-slate-500">Given / When / Then · Edge cases · Security</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {qaPlanMarkdown && (
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={handleCopyQA}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 text-[11px] font-medium transition-all"
                  >
                    {qaCopied
                      ? <><Check className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Copied!</span></>
                      : <><Copy className="w-3 h-3" /><span>Copy</span></>
                    }
                  </motion.button>
                )}
                <button
                  id="pipeline-gen-qa-btn"
                  onClick={fetchQAPlan}
                  disabled={isFortressLoading}
                  className="cta-btn cta-btn--blue flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: 'var(--cta-primary)', color: 'var(--cta-text)' }}
                >
                  {isFortressLoading
                    ? <RefreshCw className="w-3 h-3 animate-spin" />
                    : <Sparkles className="w-3 h-3" />
                  }
                  {isFortressLoading ? 'Analyzing...' : qaPlanMarkdown ? 'Regenerate' : 'Generate'}
                </button>
              </div>
            </div>

            {/* Files analyzed strip */}
            {!isFortressLoading && filesAnalyzed.length > 0 && (
              <div className="px-5 py-2 flex flex-wrap items-center gap-1.5 border-b border-gray-100 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-900/40 shrink-0">
                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-slate-500 mr-1">
                  {filesAnalyzed.length} {filesAnalyzed.length === 1 ? 'file' : 'files'}:
                </span>
                {filesAnalyzed.map((f) => (
                  <span
                    key={f}
                    className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/20"
                  >
                    {f.split('/').pop()}
                  </span>
                ))}
              </div>
            )}

            {/* Panel body */}
            <div className="flex-1 px-5 py-5">
              {/* Loading */}
              {isFortressLoading && (
                <LivePipelineWorkflow isDarkMode={isDarkMode} />
              )}

              {/* Error */}
              {qaError && !isFortressLoading && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-500 dark:text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span className="text-xs">{qaError}</span>
                </div>
              )}

              {/* Empty state */}
              {!isFortressLoading && !qaPlanMarkdown && !qaError && (
                <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-16">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-blue-500/8 border border-blue-500/15">
                    <Sparkles className="w-5 h-5 text-slate-400 dark:text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">No test plan yet</p>
                    <p className="text-xs text-gray-400 dark:text-slate-600 max-w-xs">
                      Click <span className="font-semibold text-blue-400">Generate</span> to have Fortress analyze
                      your repo and produce a complete BDD strategy with edge cases and security checks.
                    </p>
                  </div>
                </div>
              )}

              {/* Markdown output */}
              {!isFortressLoading && qaPlanMarkdown && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={proseClass}
                >
                  <ReactMarkdown>{qaPlanMarkdown}</ReactMarkdown>
                </motion.div>
              )}
            </div>
          </div>

          {/* ─── RIGHT: API Documenter ───────────────────────────────────── */}
          <div id="pipeline-docs-panel" className="flex-1 overflow-auto flex flex-col">

            {/* Panel header */}
            <div className="sticky top-0 z-10 px-5 py-3.5 flex items-center justify-between border-b border-gray-100 dark:border-slate-800/60 bg-white/90 dark:bg-[#080d18]/90 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-violet-500/10 border border-violet-500/30">
                  <BookOpen className="w-3.5 h-3.5 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white">API Documenter</h3>
                  <p className="text-[10px] text-gray-500 dark:text-slate-500">Markdown docs · Swagger/OpenAPI block</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {apiDocsMarkdown && (
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={handleCopyDocs}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 text-[11px] font-medium transition-all"
                  >
                    {docsCopied
                      ? <><Check className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Copied!</span></>
                      : <><Copy className="w-3 h-3" /><span>Copy</span></>
                    }
                  </motion.button>
                )}
                <button
                  id="pipeline-gen-docs-btn"
                  onClick={fetchApiDocs}
                  disabled={isDocsLoading}
                  className="cta-btn cta-btn--violet flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: 'var(--cta-primary)', color: 'var(--cta-text)' }}
                >
                  {isDocsLoading
                    ? <RefreshCw className="w-3 h-3 animate-spin" />
                    : <FileText className="w-3 h-3" />
                  }
                  {isDocsLoading ? 'Analyzing...' : apiDocsMarkdown ? 'Regenerate' : 'Generate'}
                </button>
              </div>
            </div>

            {/* Panel body */}
            <div className="flex-1 px-5 py-5">
              {/* Loading */}
              {isDocsLoading && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5 mb-5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-violet-400 shrink-0" />
                    <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
                      Fortress is analyzing routes and writing API documentation...
                    </span>
                  </div>
                  {[70, 50, 80, 40, 65, 55, 45].map((w, i) => (
                    <div
                      key={i}
                      className="h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse"
                      style={{ width: `${w}%`, animationDelay: `${i * 110}ms` }}
                    />
                  ))}
                  {/* Swagger block skeleton */}
                  <div className="mt-5 rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-2">
                    {[90, 60, 75, 50, 85].map((w, i) => (
                      <div
                        key={i}
                        className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse"
                        style={{ width: `${w}%`, animationDelay: `${(i + 7) * 110}ms` }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Error */}
              {docsError && !isDocsLoading && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-500 dark:text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span className="text-xs">{docsError}</span>
                </div>
              )}

              {/* Empty state */}
              {!isDocsLoading && !apiDocsMarkdown && !docsError && (
                <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-16">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-violet-500/8 border border-violet-500/15">
                    <BookOpen className="w-5 h-5 text-slate-400 dark:text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">No API docs yet</p>
                    <p className="text-xs text-gray-400 dark:text-slate-600 max-w-xs">
                      Click <span className="font-semibold text-violet-400">Generate</span> to have Fortress scan
                      your routes and produce comprehensive Markdown API docs with a Swagger/OpenAPI spec.
                    </p>
                  </div>
                </div>
              )}

              {/* Markdown output */}
              {!isDocsLoading && apiDocsMarkdown && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={proseClass}
                >
                  <ReactMarkdown>{apiDocsMarkdown}</ReactMarkdown>
                </motion.div>
              )}
            </div>
          </div>

        </div>{/* end split panels */}

      </div>
    </div>
  );
}
