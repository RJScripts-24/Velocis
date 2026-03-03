"use client";

import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'motion/react';
import {
  AlertCircle, Sun, Moon, Shield, Home, Folder, Sparkles, RefreshCw,
  BookOpen, Copy, Check, FileText,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router';

// ─── PipelinePage ─────────────────────────────────────────────────────────────
export function PipelinePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const themeClass = isDarkMode ? 'dark' : '';

  const repoName = id ?? 'Unknown';

  // ── Fortress QA Strategist ────────────────────────────────────────────────
  const [isFortressLoading, setIsFortressLoading] = useState(false);
  const [qaPlanMarkdown, setQaPlanMarkdown] = useState<string>('');
  const [qaError, setQaError] = useState<string | null>(null);
  const [filesAnalyzed, setFilesAnalyzed] = useState<string[]>([]);
  const [qaCopied, setQaCopied] = useState(false);

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
      <div className="h-screen flex flex-col bg-slate-50 dark:bg-[#080d18] text-gray-900 dark:text-gray-100 transition-colors duration-300">

        {/* ── Top Bar ── */}
        <div className="border-b h-[60px] flex items-center justify-between px-6 bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800 backdrop-blur-md shadow-sm z-20 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md flex items-center justify-center bg-gray-900 dark:bg-white">
                <span className="text-white dark:text-gray-900 font-bold text-sm">V</span>
              </div>
              <span className="font-bold hidden sm:block">Velocis</span>
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
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 shadow-sm cursor-pointer">
              <span className="text-sm font-bold">R</span>
            </div>
          </div>
        </div>

        {/* ── Sub-header ── */}
        <div className="shrink-0 px-6 py-3 border-b border-gray-100 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 backdrop-blur-sm flex items-center gap-3">
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
          <div className="flex-1 overflow-auto border-r border-gray-200 dark:border-slate-800/70 flex flex-col">

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
                  onClick={fetchQAPlan}
                  disabled={isFortressLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[11px] font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5 mb-5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400 shrink-0" />
                    <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
                      Fetching repo files and generating BDD test scenarios...
                    </span>
                  </div>
                  {[75, 55, 68, 45, 60, 38, 70].map((w, i) => (
                    <div
                      key={i}
                      className="h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse"
                      style={{ width: `${w}%`, animationDelay: `${i * 110}ms` }}
                    />
                  ))}
                </div>
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
          <div className="flex-1 overflow-auto flex flex-col">

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
                  onClick={fetchApiDocs}
                  disabled={isDocsLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-400 text-[11px] font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
