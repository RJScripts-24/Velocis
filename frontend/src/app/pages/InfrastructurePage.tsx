"use client";

import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronDown, Download, RefreshCw, Shield, Lock, Zap, RotateCcw, DollarSign, TrendingDown, Server, Database, Activity, CloudCog, Home, Folder, Sun, Moon, Copy, Maximize2, Terminal } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { useTheme } from '../../lib/theme';
import { predictInfrastructure, getWorkspaceFiles, getFileContent, type InfraPredictionData, getRepo } from '../../lib/api';
import lightLogoImg from '../../../LightLogo.png';
import darkLogoImg from '../../../DarkLogo.png';

const INFRA_TF_PLACEHOLDER = '# No analysis yet.\n# Click "Analyse Infrastructure" in the toolbar to generate\n# real Terraform IaC from your repository code.';



export function InfrastructurePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { isDarkMode, setIsDarkMode } = useTheme();
  const [environment, setEnvironment] = useState<'production' | 'staging' | 'preview'>('production');
  // Cost data is derived entirely from infraData (AI prediction) — no initial mock values
  const [tfCode, setTfCode] = useState<string>(INFRA_TF_PLACEHOLDER);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isWhyInfraExpanded, setIsWhyInfraExpanded] = useState(false);

  // ── IaC Predictor State ──────────────────────────────────────────────
  const [isInfraLoading, setIsInfraLoading] = useState(false);
  const [infraError, setInfraError] = useState<string | null>(null);
  const [infraData, setInfraData] = useState<InfraPredictionData | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState('');
  const codeRef = useRef<HTMLDivElement>(null);

  const themeClass = isDarkMode ? 'dark' : '';
  const [repoName, setRepoName] = useState<string>('');

  // ── Restore cached infra data on mount ──────────────────────────────────
  useEffect(() => {
    if (!id) return;
    getRepo(id).then(r => setRepoName(r.name)).catch(() => {});
    try {
      const cached = localStorage.getItem(`velocis:infra:${id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        setInfraData(parsed.data ?? null);
        if (parsed.data?.iacCode) setTfCode(parsed.data.iacCode);
      }
    } catch { /* ignore corrupt cache */ }
  }, [id]);

  // ── File extensions worth analysing for infrastructure prediction ─────
  const CODE_EXTENSIONS = new Set([
    'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs',
    'py', 'go', 'rs', 'java', 'kt', 'rb', 'php', 'cs',
    'json', 'yaml', 'yml', 'toml',
    'tf', 'hcl', 'Dockerfile', 'sh',
  ]);
  const SKIP_SEGMENTS = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', 'vendor', '__pycache__'];
  const MAX_FILES = 15;
  const MAX_CHARS_PER_FILE = 4000;
  const MAX_TOTAL_CHARS = 80_000;

  // ── Analyse Infrastructure: fetch REAL repo code then predict ─────────
  const analyseInfrastructure = async () => {
    if (!id) return;
    setIsInfraLoading(true);
    setInfraError(null);
    setAnalysisProgress('Fetching repository file tree…');

    try {
      // 1. Get the full recursive file listing from the workspace API
      const { files } = await getWorkspaceFiles(id, '/', true);

      // 2. Filter to code files only (skip node_modules, dist, etc.)
      const codeFiles = files
        .filter(f => f.type === 'file')
        .filter(f => {
          const lower = f.path.toLowerCase();
          if (SKIP_SEGMENTS.some(seg => lower.includes(seg))) return false;
          const ext = f.name.split('.').pop() ?? '';
          return CODE_EXTENSIONS.has(ext);
        })
        .slice(0, MAX_FILES);

      if (codeFiles.length === 0) {
        setInfraError('No code files found in this repository to analyse.');
        setIsInfraLoading(false);
        return;
      }

      setAnalysisProgress(`Reading ${codeFiles.length} code files…`);

      // 3. Fetch the content of each file in parallel
      const fileContents = await Promise.all(
        codeFiles.map(async (f) => {
          try {
            const { content, path } = await getFileContent(id!, f.path);
            const truncated = content.length > MAX_CHARS_PER_FILE
              ? content.slice(0, MAX_CHARS_PER_FILE) + '\n// ... (truncated)'
              : content;
            return `// ─── ${path} ───\n${truncated}`;
          } catch {
            return null; // skip files that fail to fetch
          }
        })
      );

      // 4. Concatenate all file contents into a single code blob
      let codeBlob = fileContents.filter(Boolean).join('\n\n');
      if (codeBlob.length > MAX_TOTAL_CHARS) {
        codeBlob = codeBlob.slice(0, MAX_TOTAL_CHARS) + '\n// ... (remaining files truncated)';
      }

      setAnalysisProgress('Velocis Cloud Architect is analysing infrastructure…');

      // 5. Send to the AI prediction endpoint
      const res = await predictInfrastructure(codeBlob);
      setInfraData(res.data);
      if (res.data.iacCode) setTfCode(res.data.iacCode);

      // Cache to localStorage so it persists across navigation
      try {
        localStorage.setItem(`velocis:infra:${id}`, JSON.stringify({
          data: res.data,
          savedAt: new Date().toISOString(),
        }));
      } catch { /* storage full — ignore */ }

    } catch (err: any) {
      setInfraError(err?.message ?? 'Infrastructure analysis failed. Please try again.');
      console.error('IaC Predictor error:', err);
    } finally {
      setIsInfraLoading(false);
      setAnalysisProgress('');
    }
  };

  // ── Copy to clipboard ────────────────────────────────────────────────
  const handleCopy = async () => {
    const code = infraData?.iacCode ?? tfCode;
    try {
      await navigator.clipboard.writeText(code);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch { /* clipboard may not be available */ }
  };

  // ── Download as .tf file ─────────────────────────────────────────────
  const handleDownload = () => {
    const code = infraData?.iacCode ?? tfCode;
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'main.tf';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Toggle fullscreen ────────────────────────────────────────────────
  const handleFullscreen = () => {
    if (!codeRef.current) return;
    if (!document.fullscreenElement) {
      codeRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // ── Impact pill color helper ─────────────────────────────────────────
  const getImpactPillStyle = (text: string) => {
    const trimmed = text.trim();
    if (trimmed.startsWith('+')) return {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      border: 'border-emerald-200/60 dark:border-emerald-800/40',
      text: 'text-emerald-700 dark:text-emerald-400',
      icon: '+',
    };
    if (trimmed.startsWith('~')) return {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200/60 dark:border-amber-800/40',
      text: 'text-amber-700 dark:text-amber-400',
      icon: '~',
    };
    if (trimmed.startsWith('-')) return {
      bg: 'bg-rose-50 dark:bg-rose-900/20',
      border: 'border-rose-200/60 dark:border-rose-800/40',
      text: 'text-rose-700 dark:text-rose-400',
      icon: '-',
    };
    return {
      bg: 'bg-zinc-50 dark:bg-slate-800/40',
      border: 'border-zinc-200/60 dark:border-slate-700/40',
      text: 'text-zinc-600 dark:text-slate-400',
      icon: '•',
    };
  };

  // ── Confidence badge color helper ────────────────────────────────────
  const getConfidenceBadge = () => {
    if (!infraData) return null;
    const score = infraData.confidenceScore;
    const label = score > 80 ? 'High' : score > 50 ? 'Medium' : 'Low';
    const colorClass = score > 80
      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100/50 dark:border-emerald-800/30'
      : score > 50
        ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-100/50 dark:border-amber-800/30'
        : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border-rose-100/50 dark:border-rose-800/30';
    return { label, score, colorClass };
  };

  // ── Parse a cost number from the AI's costProjection string ─────────────
  // e.g. "$12.50/month" → 12.50, "$0.00/month (Free Tier)" → 0
  const parsedCost: number | null = (() => {
    if (!infraData?.costProjection) return null;
    const match = infraData.costProjection.match(/\$([\d,]+\.?\d*)/);
    if (!match) return null;
    return parseFloat(match[1].replace(/,/g, ''));
  })();

  // ── Build a simple cost breakdown list from the AI impact summary ────────
  // Extract service names from lines like "+ 1 Lambda Function", "+ 2 DynamoDB Tables"
  const SERVICE_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b',
    '#3b82f6', '#10b981', '#f97316', '#ef4444', '#06b6d4',
  ];
  const aiCostBreakdown: { service: string; cost_usd: number; percentage: number; color: string }[] = (() => {
    if (!infraData?.impactSummary || parsedCost === null) return [];
    // Filter only added/modified resources (+ or ~)
    const services = infraData.impactSummary
      .filter(s => s.trim().startsWith('+') || s.trim().startsWith('~'))
      .map(s => s.replace(/^[+~-]\s*\d*\s*/, '').trim())
      .filter(Boolean);
    if (services.length === 0) return [];
    const perService = parsedCost / services.length;
    return services.map((service, i) => ({
      service,
      cost_usd: perService,
      percentage: 100 / services.length,
      color: SERVICE_COLORS[i % SERVICE_COLORS.length],
    }));
  })();

  // ── Placeholder: no regenerate needed (analysis replaces it) ─────────────
  const handleRegenerate = async () => {
    await analyseInfrastructure();
  };


  return (
    <div className={`${themeClass} w-full h-full`}>
      <style>
        {`
          /* ── CTA Button – lift + ripple-after animation (colours unchanged) ── */
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
            top: 0;
            left: 0;
            z-index: -1;
            background-color: var(--cta-primary, #6366f1);
            transition: transform 0.4s, opacity 0.4s;
          }
          .cta-btn:hover::after {
            transform: scaleX(1.4) scaleY(1.6);
            opacity: 0;
          }

          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: rgba(156, 163, 175, 0.3);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background-color: rgba(156, 163, 175, 0.5);
          }
          .dark .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: rgba(71, 85, 105, 0.5);
          }
          .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background-color: rgba(71, 85, 105, 0.8);
          }
        `}
      </style>

      {/* ΓöÇΓöÇ App Shell: viewport-locked, no page scroll ΓöÇΓöÇ */}
      <div className="w-full h-screen flex flex-col overflow-hidden bg-zinc-50 dark:bg-[#010308] font-['JetBrains_Mono',_monospace] transition-colors duration-300 relative">

        {/* Dark Mode Radial & Noise Overlays */}
        {isDarkMode && (
          <>
            <div className="absolute inset-0 pointer-events-none z-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(30,41,59,1)_0%,_rgba(15,23,42,1)_100%)] opacity-80 mix-blend-multiply" />
            <div className="absolute inset-0 pointer-events-none z-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]" />
            <div
              className="absolute inset-0 pointer-events-none z-0 opacity-[0.03]"
              style={{
                backgroundImage: `url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                mixBlendMode: 'overlay'
              }}
            />
          </>
        )}

        {/* ΓöÇΓöÇ Top Navigation ΓöÇΓöÇ full-width, crisp border ΓöÇΓöÇ */}
        <div className="flex-none z-50 w-full border-b border-gray-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 backdrop-blur-xl transition-colors duration-300 relative">
          <div className="w-full px-5 h-[52px] flex items-center justify-between">
            {/* Left ΓÇô Breadcrumb */}
            <div className="flex items-center gap-4">
              <div className="flex items-center">
                <img src={isDarkMode ? darkLogoImg : lightLogoImg} alt="Velocis" className="h-7 w-auto object-contain" />
              </div>

              <div className="flex items-center gap-2 text-[13px] text-zinc-500 dark:text-slate-400 font-medium">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Dashboard</span>
                </button>
                <span className="text-zinc-300 dark:text-slate-700">/</span>
                <button
                  onClick={() => navigate(`/repo/${id}`)}
                  className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{repoName}</span>
                </button>
                <span className="text-zinc-300 dark:text-slate-700">/</span>
                <span className="text-zinc-900 dark:text-slate-100 font-semibold">Infrastructure</span>
              </div>
            </div>

            {/* Center ΓÇô Environment Selector */}
            <div className="hidden md:flex items-center p-0.5 rounded-md bg-zinc-100/80 dark:bg-slate-800/80 border border-zinc-200/50 dark:border-slate-700/50 shadow-inner transition-colors">
              {(['production', 'staging', 'preview'] as const).map((env) => (
                <button
                  key={env}
                  onClick={() => setEnvironment(env)}
                  className={`px-3 py-1 rounded text-[13px] font-semibold transition-all capitalize ${environment === env
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm border border-zinc-200/50 dark:border-slate-600/50'
                    : 'text-zinc-500 dark:text-slate-400 hover:text-zinc-700 dark:hover:text-slate-200'
                    }`}
                >
                  {env}
                </button>
              ))}
            </div>

            {/* Right ΓÇô Actions */}
            <div className="flex items-center gap-2">
              <button
                className="cta-btn hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--cta-primary)', color: 'var(--cta-text)' }}
                title="Analyse real code files to predict AWS infrastructure"
                onClick={analyseInfrastructure}
                disabled={isInfraLoading}
              >
                <CloudCog className={`w-4 h-4 ${isInfraLoading ? 'animate-spin' : ''}`} />
                {isInfraLoading ? 'Analysing…' : 'Analyse Infrastructure'}
              </button>
              <button
                className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors text-zinc-500 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-slate-100 hidden sm:block"
                title="Regenerate IaC"
                onClick={handleRegenerate}
                disabled={isRegenerating}
              >
                <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
              </button>
              <button
                className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors text-zinc-500 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-slate-100 hidden sm:block"
                title="Export IaC"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors text-zinc-500 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-slate-100"
              >
                {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
              <div className="relative ml-1">
                <div className="w-7 h-7 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-500/30 shadow-sm cursor-pointer hover:scale-105 transition-transform">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">R</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ΓöÇΓöÇ Context Strip ΓöÇΓöÇ full-width info bar ΓöÇΓöÇ */}
        <div className="flex-none w-full border-b border-gray-200 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/40 backdrop-blur-md transition-colors duration-300 relative z-40">
          <div className="w-full px-5 py-2 flex items-center justify-between">
            <div className="flex flex-col justify-center">
              <div className="font-semibold text-[13px] text-zinc-900 dark:text-slate-100 transition-colors leading-tight">
                IaC Predictor active
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-slate-400 transition-colors leading-tight mt-0.5">
                Infrastructure changes generated from latest commit
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="inline-flex items-center px-2.5 h-[22px] rounded text-[10px] sm:text-[11px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-800/30 shadow-sm transition-colors leading-none">
                Generated by Velocis AI
              </div>
              <span className="hidden sm:inline-flex items-center h-[22px] text-[11px] font-medium text-zinc-500 dark:text-slate-400 transition-colors leading-none">
                {infraData ? 'AI analysis complete' : 'Awaiting analysis'}
              </span>
            </div>
          </div>
        </div>

        {/* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
            MAIN CONTENT ΓÇö structural split-pane, fills remaining height
            ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */}
        <div className="flex-1 flex flex-row overflow-hidden relative z-10">

          {/* ΓöÇΓöÇ LEFT PANE: Code Editor (70%) ΓöÇΓöÇ */}
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="w-[70%] h-full bg-white dark:bg-[#010308]/50 border-r border-gray-200 dark:border-slate-800 flex flex-col relative transition-colors duration-300"
          >
            {/* Subtle glow */}
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-full blur-[100px] pointer-events-none" />

            {/* Panel Header ΓÇö sticky */}
            <div className="sticky top-0 z-20 flex flex-col bg-zinc-50/90 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 transition-colors">
              <div className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Terminal className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                  <span className="font-['JetBrains_Mono',_monospace] text-[13px] font-semibold text-zinc-800 dark:text-slate-200">
                    main.tf
                  </span>
                  {/* Metadata Badges */}
                  <div className="hidden sm:flex items-center gap-2 ml-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium text-zinc-500 dark:text-slate-400 bg-zinc-100 dark:bg-slate-800 border border-zinc-200/80 dark:border-slate-700/80 transition-colors">
                      Terraform
                    </span>
                    {(() => {
                      const conf = getConfidenceBadge();
                      if (!conf) return null;
                      return (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${conf.colorClass}`}>
                          {conf.label} ({conf.score}%)
                        </span>
                      );
                    })()}
                    <span className="font-mono text-[10px] text-zinc-400 dark:text-slate-500 transition-colors">
                      {infraData ? 'AI-generated' : '—'}
                    </span>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-1.5">
                  <div className="hidden sm:flex items-center mr-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-800/30 gap-1.5 transition-colors">
                    <Zap className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
                    AI Snapshot
                  </div>
                  <button
                    onClick={handleCopy}
                    className={`p-1.5 rounded-md transition-colors ${copySuccess ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30' : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:text-slate-200 dark:hover:bg-slate-800'}`}
                    title={copySuccess ? 'Copied!' : 'Copy code'}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleDownload}
                    className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
                    title="Download as .tf"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleFullscreen}
                    className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
                    title="Fullscreen"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Infrastructure Impact Strip — Dynamic from AI */}
              <div className="px-5 min-h-[40px] py-2 bg-white/50 dark:bg-[#010308]/30 flex items-center border-t border-gray-100 dark:border-slate-800/50 transition-colors">
                <span className="text-[11px] font-medium text-zinc-400 dark:text-slate-500 mr-4 tracking-wide uppercase flex-shrink-0">Impact</span>
                <div className="flex items-center gap-2 flex-wrap font-['JetBrains_Mono',_monospace] text-[11px]">
                  {infraData?.impactSummary ? (
                    infraData.impactSummary.map((item, i) => {
                      const style = getImpactPillStyle(item);
                      return (
                        <span
                          key={i}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold border transition-all hover:scale-[1.03] ${style.bg} ${style.border} ${style.text}`}
                        >
                          <span className="text-[13px] leading-none font-bold">{style.icon}</span>
                          {item.replace(/^[+~-]\s*/, '')}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-[11px] text-zinc-400 dark:text-slate-500 italic">
                      {isInfraLoading ? analysisProgress : 'Run an analysis to see infrastructure impact'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Code Viewer — scrollable within pane */}
            <div ref={codeRef} className="flex-1 overflow-y-auto bg-[#f8f9fa] dark:bg-[#0a0c10] relative z-10 custom-scrollbar transition-colors">
              {/* Loading Skeleton */}
              {isInfraLoading ? (
                <div className="p-6 space-y-3">
                  <div className="flex items-center gap-3 mb-6">
                    <CloudCog className="w-5 h-5 text-indigo-500 animate-pulse" />
                    <span className="text-[13px] font-medium text-indigo-600 dark:text-indigo-400 animate-pulse">
                      {analysisProgress || 'Analysing infrastructure…'}
                    </span>
                  </div>
                  {/* Skeleton lines mimicking code */}
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-3 rounded bg-zinc-200 dark:bg-slate-800 animate-pulse" />
                      <div
                        className="h-3 rounded bg-zinc-200 dark:bg-slate-800 animate-pulse"
                        style={{ width: `${30 + Math.random() * 55}%` }}
                      />
                    </div>
                  ))}
                </div>
              ) : infraError ? (
                <div className="p-6 flex flex-col items-center justify-center h-full text-center">
                  <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center mb-4">
                    <CloudCog className="w-6 h-6 text-rose-500" />
                  </div>
                  <p className="text-sm font-semibold text-zinc-700 dark:text-slate-300 mb-1">Analysis Failed</p>
                  <p className="text-[12px] text-zinc-500 dark:text-slate-400 max-w-xs">{infraError}</p>
                  <button
                    onClick={analyseInfrastructure}
                    className="mt-4 px-4 py-1.5 rounded-md text-[12px] font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <pre className="text-[12.5px] leading-[1.55] py-4 font-['JetBrains_Mono',_monospace]">
                  {(infraData?.iacCode ?? tfCode).split('\n').map((line, index) => {
                    const lineNumber = index + 1;
                    const isAddedLine = line.includes('memory_size') || line.includes('timeout') || line.includes('cors_configuration');
                    const isModifiedLine = line.includes('role          = aws_iam_role.lambda_exec.arn');
                    const isComment = line.trim().startsWith('#');
                    const isAnnotation = line.includes('Velocis:');
                    const isResourceHeader = line.startsWith('resource ') || line.startsWith('provider ') || line.startsWith('terraform {');

                    let highlightedLine = <span className="text-zinc-800 dark:text-slate-300 transition-colors">{line || ' '}</span>;

                    if (isComment) {
                      highlightedLine = <span className="text-zinc-400 dark:text-slate-500 transition-colors italic">{line}</span>;
                    } else if (isAnnotation) {
                      highlightedLine = <span className="text-indigo-600 dark:text-indigo-400 font-medium transition-colors">{line}</span>;
                    } else {
                      const parts = line.split(/(\".*?\"|{|}|[A-Za-z0-9_]+|[=]+)/g);
                      highlightedLine = (
                        <span className={isResourceHeader ? 'font-semibold' : ''}>
                          {parts.map((part, i) => {
                            if (!part) return null;
                            if (part.startsWith('"') && part.endsWith('"')) {
                              return <span key={i} className="text-amber-600 dark:text-amber-300">{part}</span>;
                            } else if (['resource', 'provider', 'terraform', 'required_providers'].includes(part)) {
                              return <span key={i} className="text-pink-600 dark:text-pink-400">{part}</span>;
                            } else if (['aws_lambda_function', 'aws_apigatewayv2_api', 'aws_dynamodb_table', 'aws_iam_role', 'aws_sfn_state_machine', 'aws_db_instance', 'aws_s3_bucket', 'aws_sqs_queue', 'aws_sns_topic', 'aws_cloudfront_distribution'].includes(part)) {
                              return <span key={i} className="text-purple-600 dark:text-purple-400">{part}</span>;
                            } else if (['memory_size', 'timeout', 'filename', 'function_name', 'role', 'handler', 'runtime', 'environment', 'variables', 'name', 'protocol_type', 'cors_configuration', 'billing_mode', 'hash_key', 'range_key', 'attribute', 'type', 'ttl', 'attribute_name', 'enabled', 'tags', 'assume_role_policy', 'definition', 'source', 'version', 'region', 'bucket', 'acl', 'versioning', 'effect', 'actions', 'resources'].includes(part)) {
                              return <span key={i} className="text-sky-600 dark:text-sky-400">{part}</span>;
                            } else if (!isNaN(Number(part)) && part.trim() !== '') {
                              return <span key={i} className="text-orange-500 dark:text-orange-400">{part}</span>;
                            } else if (part === '=') {
                              return <span key={i} className="text-zinc-400 dark:text-slate-500">{part}</span>;
                            } else {
                              return <span key={i} className="text-zinc-800 dark:text-slate-200">{part}</span>;
                            }
                          })}
                        </span>
                      );
                    }

                    // Determine Gutter Symbol & Styling
                    let gutterSymbol = ' ';
                    let bgStyle = 'border-l-[3px] border-l-transparent';
                    let numBgStyle = '';
                    let codeBgStyle = '';
                    let numColor = 'text-zinc-400 dark:text-slate-600';

                    if (isAddedLine) {
                      gutterSymbol = '+';
                      bgStyle = 'border-l-[3px] border-l-emerald-500';
                      numBgStyle = 'bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-500';
                      codeBgStyle = 'bg-emerald-50/70 dark:bg-emerald-900/20';
                    } else if (isModifiedLine) {
                      gutterSymbol = '~';
                      bgStyle = 'border-l-[3px] border-l-amber-500';
                      numBgStyle = 'bg-amber-50/50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-500';
                      codeBgStyle = 'bg-amber-50/70 dark:bg-amber-900/20';
                    }

                    return (
                      <div
                        key={index}
                        className={`flex items-start hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors ${bgStyle}`}
                      >
                        <div
                          className={`inline-flex w-12 text-right select-none flex-shrink-0 border-r border-zinc-200/80 dark:border-slate-800 text-[11px] font-mono transition-colors ${numBgStyle}`}
                        >
                          <span className="w-5 text-center font-bold">{gutterSymbol}</span>
                          <span className={`w-7 pr-2 ${numColor}`}>{lineNumber}</span>
                        </div>
                        <div className={`flex-1 break-all pl-4 ${codeBgStyle}`}>
                          {highlightedLine}
                        </div>
                      </div>
                    );
                  })}
                </pre>
              )}
            </div>

            {/* "Why this infra?" Footer — only shown after AI analysis */}
            {infraData && (
              <div className="flex-none bg-white dark:bg-[#010308]/50 border-t border-gray-200 dark:border-slate-800 transition-colors">
                <button
                  onClick={() => setIsWhyInfraExpanded(!isWhyInfraExpanded)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-zinc-50 dark:hover:bg-slate-900/50 transition-colors"
                >
                  <h4 className="text-[13px] font-semibold text-zinc-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-zinc-400 dark:text-slate-500" />
                    Why this infrastructure was inferred
                  </h4>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-400 dark:text-slate-500 transition-transform duration-200 ${isWhyInfraExpanded ? 'rotate-180' : ''}`}
                  />
                </button>
                {isWhyInfraExpanded && (
                  <div className="px-5 pb-5 pt-0">
                    <p className="text-[12px] text-zinc-500 dark:text-slate-400 leading-relaxed">
                      The AI analysed your repository's code patterns, dependencies, and architecture. The generated Terraform represents the minimal AWS serverless infrastructure required to deploy your application.
                    </p>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* ΓöÇΓöÇ RIGHT PANE: Analytics & Cost (30%) ΓöÇΓöÇ */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="w-[30%] h-full bg-gray-50 dark:bg-[#010308]/70 flex flex-col overflow-hidden transition-colors duration-300"
          >
            {/* Scrollable content wrapper */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {/* ΓöÇΓöÇΓöÇ Cost Section ΓöÇΓöÇΓöÇ */}
              <div className="p-6 pb-6 mb-0 border-b border-gray-200 dark:border-slate-800">
                {/* Cost header */}
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-slate-100 tracking-tight transition-colors">
                    Projected Monthly Cost
                  </h3>
                  <div className="text-[11px] text-zinc-500 dark:text-slate-400 px-2 py-0.5 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700 transition-colors">
                    {infraData ? 'AI prediction' : 'Pending'}
                  </div>
                </div>

                <p className="text-[11px] text-zinc-500 dark:text-slate-400 mb-5 transition-colors">
                  Based on current traffic assumptions and infrastructure changes
                </p>

                {/* AI Cost Projection Badge */}
                {infraData?.costProjection && (
                  <div className="mb-4 px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 border border-indigo-100/50 dark:border-indigo-800/30">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mb-1">AI Projection</div>
                    <div className="text-[15px] font-semibold text-indigo-700 dark:text-indigo-300">{infraData.costProjection}</div>
                  </div>
                )}

                {/* Primary Cost — only shown after AI analysis */}
                {infraData ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="mb-3"
                  >
                    <div className="text-4xl font-semibold tracking-tight text-emerald-500 dark:text-emerald-400 transition-colors flex items-baseline gap-1">
                      {parsedCost !== null ? (
                        <>
                          <span className="text-2xl font-medium">$</span>
                          {parsedCost.toFixed(2)}
                          <span className="text-lg font-medium text-zinc-400 dark:text-slate-500 ml-1">/ mo</span>
                        </>
                      ) : (
                        <span className="text-2xl font-semibold text-indigo-600 dark:text-indigo-400">
                          {infraData.costProjection}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  /* No analysis yet — show pending placeholder */
                  <div className="mb-3 flex items-center gap-2 text-zinc-400 dark:text-slate-500">
                    <DollarSign className="w-5 h-5" />
                    <span className="text-[14px] font-medium italic">Run analysis to see cost</span>
                  </div>
                )}

                {/* Cost Trend — only if AI data is available */}
                {infraData?.costProjection && (
                  <div className="flex items-center gap-2 mb-6 px-2.5 py-1.5 rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 w-fit transition-colors">
                    <TrendingDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-[12px] font-semibold text-emerald-700 dark:text-emerald-300 transition-colors">
                      Serverless cost model
                    </span>
                  </div>
                )}

                {/* Cost Breakdown — only shown after AI analysis */}
                {infraData && (
                  <div className="border-b border-gray-200 dark:border-slate-800 pb-6 mb-6">
                    <h4 className="text-[13px] font-semibold mb-3 text-zinc-900 dark:text-slate-100 transition-colors">
                      Cost Breakdown
                    </h4>

                    {aiCostBreakdown.length > 0 ? (
                      <>
                        {/* Stacked Bar */}
                        <div className="h-5 rounded overflow-hidden flex gap-[1px] mb-4 shadow-inner">
                          {aiCostBreakdown.map((item, index) => (
                            <div
                              key={index}
                              className="group relative transition-all hover:brightness-110 hover:scale-y-105 origin-bottom cursor-pointer"
                              style={{
                                width: `${item.percentage}%`,
                                backgroundColor: item.color
                              }}
                            >
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-2 rounded-md opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap bg-zinc-900 dark:bg-slate-100 shadow-xl z-50 transform group-hover:-translate-y-1">
                                <div className="text-[10px] font-bold text-zinc-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">{item.service}</div>
                                <div className="text-sm font-semibold text-white dark:text-zinc-900">${item.cost_usd.toFixed(2)}</div>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-900 dark:border-t-slate-100" />
                              </div>
                            </div>
                          ))}
                        </div>
                        {/* Legend */}
                        <div className="space-y-2.5">
                          {aiCostBreakdown.map((item, index) => (
                            <div key={index} className="flex items-center justify-between text-[13px] group/item">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className="w-2 h-2 rounded-full group-hover/item:scale-125 transition-transform"
                                  style={{ backgroundColor: item.color }}
                                />
                                <span className="text-zinc-600 dark:text-slate-400 font-medium transition-colors">{item.service}</span>
                              </div>
                              <span className="font-semibold text-zinc-900 dark:text-slate-200 transition-colors">
                                ${item.cost_usd.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      /* AI returned no +/~ services — show the raw costProjection text */
                      <p className="text-[12px] text-zinc-500 dark:text-slate-400 italic">
                        {infraData.costProjection}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Insights — only shown after AI analysis */}
              {infraData && (
                <div className="p-6 border-b border-gray-200 dark:border-slate-800 space-y-3">
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 dark:text-slate-500 mb-4">Insights</h4>
                  <div className="p-3.5 bg-white dark:bg-slate-900/50 border-l-[3px] border-l-emerald-500 border border-gray-200 dark:border-slate-800 rounded-md transition-colors">
                    <div className="flex items-start gap-2.5">
                      <Zap className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-500 dark:text-emerald-400" />
                      <div>
                        <h4 className="text-[12px] font-semibold mb-0.5 text-zinc-900 dark:text-slate-100 tracking-tight">Serverless Architecture</h4>
                        <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-slate-400 font-medium">
                          No idle compute detected. Estimated baseline cost remains near zero during inactivity.
                        </p>
                      </div>
                    </div>
                  </div>
                  {environment === 'production' && (
                    <div className="p-3.5 bg-white dark:bg-slate-900/50 border-l-[3px] border-l-amber-500 border border-gray-200 dark:border-slate-800 rounded-md transition-colors">
                      <div className="flex items-start gap-2.5">
                        <DollarSign className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500 dark:text-amber-400" />
                        <div>
                          <h4 className="text-[12px] font-semibold mb-0.5 text-zinc-900 dark:text-slate-100 tracking-tight">Cost Optimization Tip</h4>
                          <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-slate-400 font-medium">
                            Provisioned concurrency may increase monthly cost. Consider on-demand for lower traffic patterns.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Change Impact — only shown after AI analysis */}
              {infraData?.impactSummary && (
                <div className="p-6 border-b border-gray-200 dark:border-slate-800">
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 dark:text-slate-500 mb-4">Change Impact</h4>
                  <div className="grid grid-cols-1 gap-3">
                    {/* Resources Added */}
                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 rounded-md transition-colors">
                      <div className="w-9 h-9 rounded-md flex items-center justify-center bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/50 transition-colors flex-shrink-0">
                        <Server className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-medium text-zinc-500 dark:text-slate-400 transition-colors">Resources Added</div>
                        <div className="text-xl font-bold text-zinc-900 dark:text-slate-100 tracking-tight transition-colors leading-tight">
                          {infraData.impactSummary.filter(s => s.trim().startsWith('+')).length}
                        </div>
                      </div>
                    </div>
                    {/* Resources Modified */}
                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 rounded-md transition-colors">
                      <div className="w-9 h-9 rounded-md flex items-center justify-center bg-amber-50 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-800/50 transition-colors flex-shrink-0">
                        <Activity className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-medium text-zinc-500 dark:text-slate-400 transition-colors">Resources Modified</div>
                        <div className="text-xl font-bold text-zinc-900 dark:text-slate-100 tracking-tight transition-colors leading-tight">
                          {infraData.impactSummary.filter(s => s.trim().startsWith('~')).length}
                        </div>
                      </div>
                    </div>
                    {/* Resources Removed */}
                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 rounded-md transition-colors">
                      <div className="w-9 h-9 rounded-md flex items-center justify-center bg-rose-50 dark:bg-rose-900/30 border border-rose-100 dark:border-rose-800/50 transition-colors flex-shrink-0">
                        <Shield className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-medium text-zinc-500 dark:text-slate-400 transition-colors">Resources Removed</div>
                        <div className="text-xl font-bold text-zinc-900 dark:text-slate-100 tracking-tight transition-colors leading-tight">
                          {infraData.impactSummary.filter(s => s.trim().startsWith('-')).length}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Confidence Checks — only shown after AI analysis */}
              {infraData && (
                <div className="p-6">
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 dark:text-slate-500 mb-4">Confidence Checks</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-zinc-600 dark:text-slate-300">
                      <Lock className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                      <span className="text-[12px] font-medium leading-tight">Least-privilege IAM generated</span>
                    </div>
                    <div className="flex items-center gap-3 text-zinc-600 dark:text-slate-300">
                      <Database className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                      <span className="text-[12px] font-medium leading-tight">No public S3 buckets detected</span>
                    </div>
                    <div className="flex items-center gap-3 text-zinc-600 dark:text-slate-300">
                      <Zap className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                      <span className="text-[12px] font-medium leading-tight">Serverless optimized</span>
                    </div>
                    <div className="flex items-center gap-3 text-zinc-600 dark:text-slate-300">
                      <RotateCcw className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                      <span className="text-[12px] font-medium leading-tight">Rollback ready</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Empty state before analysis */}
              {!infraData && !isInfraLoading && (
                <div className="p-6 flex flex-col items-center justify-center text-center gap-3">
                  <CloudCog className="w-10 h-10 text-zinc-300 dark:text-slate-600" />
                  <p className="text-[13px] font-semibold text-zinc-500 dark:text-slate-400">No analysis yet</p>
                  <p className="text-[11px] text-zinc-400 dark:text-slate-500 max-w-[160px] leading-relaxed">Click <strong>"Analyse Infrastructure"</strong> to generate real AWS predictions.</p>
                  <button
                    onClick={analyseInfrastructure}
                    disabled={isInfraLoading}
                    className="cta-btn mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold disabled:opacity-50"
                    style={{ backgroundColor: 'var(--cta-primary)', color: 'var(--cta-text)' }}
                  >
                    <CloudCog className="w-4 h-4" />
                    Analyse Infrastructure
                  </button>
                </div>
              )}

            </div>{/* end scrollable content wrapper */}
          </motion.div>
        </div>

        {/* ΓöÇΓöÇ Bottom Status Bar ΓöÇΓöÇ */}
        <div className="flex-none z-50 w-full border-t border-gray-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 transition-colors">
          <div className="w-full px-5 h-[28px] flex items-center justify-between text-[11px]">
            <span className="text-zinc-500 dark:text-slate-500 font-medium">┬⌐ Velocis Core</span>
            <div className="flex items-center gap-5">
              <span className="text-zinc-400 dark:text-slate-500 font-medium hidden sm:inline">Documentation</span>
              <span className="text-zinc-400 dark:text-slate-500 font-medium hidden sm:inline">Support</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                All Systems Operational
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
