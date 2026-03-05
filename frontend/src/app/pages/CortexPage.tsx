"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import ReactFlow, {
  Node, Edge, Background, Controls, MiniMap,
  useNodesState, useEdgesState, MarkerType, NodeTypes, EdgeTypes, EdgeProps,
  Connection, addEdge, Handle, Position, useReactFlow, ReactFlowProvider, useStore,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../../lib/theme';
import {
  ChevronLeft, ChevronRight, Search, Shield, TestTube2, Eye, EyeOff,
  RefreshCw, Maximize2, AlertCircle, CheckCircle, AlertTriangle,
  Loader2, Sun, Moon, Clock, Code, FileCode, Activity, TrendingUp,
  TrendingDown, GitBranch, GitMerge, Target, Download, Play, Pause, Filter,
  ArrowRight, ArrowLeft, Link, X,
} from 'lucide-react';
import {
  getCortexServices, getCortexServiceFiles, getCortexTimeline,
  rebuildCortex, getRepo,
  type CortexServicesResponse,
} from '../../lib/api';
import lightLogoImg from '../../../LightLogo.png';
import darkLogoImg from '../../../DarkLogo.png';

/* ═══════════════════════════════════════════
   CSS ANIMATIONS
═══════════════════════════════════════════ */
const PAGE_CSS = `
  @keyframes liveBlip { 0%,100%{opacity:1;} 50%{opacity:0.35;} }
  @keyframes cxSpin   { to { transform:rotate(360deg); } }
  .cx-live-dot  { animation: liveBlip 1.1s ease-in-out infinite; }
  .cx-scroll::-webkit-scrollbar { width:5px; }
  .cx-scroll::-webkit-scrollbar-track { background:transparent; }
  .cx-scroll::-webkit-scrollbar-thumb { background:rgba(100,100,130,0.3); border-radius:6px; }
  .cx-scroll::-webkit-scrollbar-thumb:hover { background:rgba(100,100,130,0.6); }
  .cx-spin { animation: cxSpin 1s linear infinite; }
`;

/* ═══════════════════════════════════════════
   TYPES
═══════════════════════════════════════════ */
interface ServiceData {
  id: number;
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  layer: 'edge' | 'compute' | 'data';
  position: { x: number; y: number; z: number };
  connections: number[];
  metrics: {
    p95_latency: string;
    error_rate_pct: number;
    sparkline: number[];
    lines_of_code: number;
    file_count: number;
    complexity: number;
    dependencies_in: number;
    dependencies_out: number;
  };
  tests: { total: number; passing: number; errors: number };
  health: { score: number; issues: string[] };
  files: string[];
  functions?: string[];
  functionCalls?: Record<string, string[]>;
  last_deployment_ago: string;
  isDark?: boolean;
}

interface FileNodeData {
  id: string;
  name: string;
  path: string;
  language: string;
  linesOfCode: number;
  complexity: number;
  functions: string[];
  functionCalls: Record<string, string[]>;
  importsFrom: string[];
  importedBy: string[];
  isSelected?: boolean;
  isDark?: boolean;
  /** Set during focus mode to indicate relationship to the selected node */
  focusRole?: 'selected' | 'imports' | 'importedBy';
}

/* ═══════════════════════════════════════════
   SPARKLINE
═══════════════════════════════════════════ */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[2px]" style={{ height: 14 }}>
      {data.map((v, i) => (
        <div key={i} style={{
          width: 5, height: `${(v / max) * 14}px`,
          backgroundColor: color, opacity: 0.85, borderRadius: 1,
        }} />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   LANGUAGE COLORS
═══════════════════════════════════════════ */
const langColors: Record<string, { bg: string; text: string; border: string }> = {
  typescript: { bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/40' },
  javascript: { bg: 'bg-yellow-500/15', text: 'text-yellow-300', border: 'border-yellow-500/40' },
  python: { bg: 'bg-green-500/15', text: 'text-green-300', border: 'border-green-500/40' },
  css: { bg: 'bg-pink-500/15', text: 'text-pink-300', border: 'border-pink-500/40' },
  html: { bg: 'bg-orange-500/15', text: 'text-orange-300', border: 'border-orange-500/40' },
  json: { bg: 'bg-slate-500/15', text: 'text-slate-300', border: 'border-slate-500/40' },
};
const defaultLangColor = { bg: 'bg-slate-500/15', text: 'text-slate-300', border: 'border-slate-500/40' };

const langColorsLight: Record<string, { bg: string; text: string; border: string }> = {
  typescript: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  javascript: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  python: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  css: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300' },
  html: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  json: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300' },
};
const defaultLangColorLight = { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300' };

/* ═══════════════════════════════════════════
   FILE NODE (compact chip for graph view)
═══════════════════════════════════════════ */
const FILE_CHIP_W = 200;
function FileNode({ data }: { data: FileNodeData }) {
  const isDark = data.isDark !== false;
  const langMap = isDark ? langColors : langColorsLight;
  const defLc = isDark ? defaultLangColor : defaultLangColorLight;
  const lc = langMap[data.language?.toLowerCase()] ?? defLc;
  const complexity = data.complexity ?? 0;
  const complexityColor = complexity > 70 ? (isDark ? 'text-red-400' : 'text-red-500')
    : complexity > 40 ? (isDark ? 'text-amber-400' : 'text-amber-500')
      : (isDark ? 'text-emerald-400' : 'text-emerald-600');
  const accentBar = complexity > 70 ? '#ef4444' : complexity > 40 ? '#f59e0b' : '#3b82f6';

  // Focus-role overrides: selected=violet, imports=purple (outgoing), importedBy=cyan (incoming)
  const roleLeftColor =
    data.focusRole === 'selected'   ? '#a78bfa' :
    data.focusRole === 'imports'    ? '#c084fc' :   // this file imports the selected
    data.focusRole === 'importedBy' ? '#22d3ee' :   // selected imports this file
    accentBar;

  const roleBorder =
    data.focusRole === 'selected'   ? '#a78bfa' :
    data.focusRole === 'imports'    ? 'rgba(192,132,252,0.55)' :
    data.focusRole === 'importedBy' ? 'rgba(34,211,238,0.55)'  :
    data.isSelected ? '#a78bfa' :
    isDark ? 'rgba(255,255,255,0.12)' : '#e5e7eb';

  const roleShadow =
    data.focusRole === 'selected'   ? '0 0 0 2px rgba(167,139,250,0.4), 0 4px 14px rgba(0,0,0,0.55)' :
    data.focusRole === 'imports'    ? '0 0 0 1.5px rgba(192,132,252,0.35), 0 4px 12px rgba(0,0,0,0.45)' :
    data.focusRole === 'importedBy' ? '0 0 0 1.5px rgba(34,211,238,0.35), 0 4px 12px rgba(0,0,0,0.45)' :
    isDark ? '0 2px 8px rgba(0,0,0,0.6)' : '0 2px 8px rgba(0,0,0,0.12)';

  const cardBg = isDark ? '#0f172a' : '#ffffff';
  const nameCls = isDark ? 'text-white/90' : 'text-gray-800';
  const metaCls = isDark ? 'text-white/35' : 'text-gray-400';
  const divCls = isDark ? 'bg-white/10' : 'bg-gray-200';

  // Role badge shown below the name
  const roleBadge =
    data.focusRole === 'imports'    ? { label: '← imports selected', color: '#c084fc' } :
    data.focusRole === 'importedBy' ? { label: 'selected imports →', color: '#22d3ee' } :
    null;

  return (
    <div
      className="relative rounded-lg transition-all duration-150 cursor-pointer"
      style={{
        width: FILE_CHIP_W,
        background: cardBg,
        border: `1px solid ${roleBorder}`,
        boxShadow: roleShadow,
        borderLeft: `3px solid ${roleLeftColor}`,
      }}
    >
      {/* Top handle — target (imports INTO this file) */}
      <Handle type="target" position={Position.Top}
        className="!w-3 !h-3 !rounded-full !border-2"
        style={{ background: '#22d3ee', borderColor: cardBg, top: -6 }} />
      {/* Bottom handle — source (this file imports others) */}
      <Handle type="source" position={Position.Bottom}
        className="!w-3 !h-3 !rounded-full !border-2"
        style={{ background: '#a78bfa', borderColor: cardBg, bottom: -6 }} />

      <div className="px-2.5 pt-1.5 pb-1.5">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`px-1 rounded text-[8px] font-bold uppercase tracking-wider flex-shrink-0 ${lc.bg} ${lc.text} border ${lc.border}`}>
            {(data.language || 'file').slice(0, 3)}
          </span>
          <span className={`text-[11px] font-semibold leading-tight truncate ${nameCls}`}>{data.name}</span>
        </div>
        {roleBadge && (
          <div className="text-[8px] font-semibold mb-0.5" style={{ color: roleBadge.color }}>
            {roleBadge.label}
          </div>
        )}
        <div className={`flex items-center gap-1.5 text-[9px] ${metaCls}`}>
          <span>{data.linesOfCode}L</span>
          <div className={`h-2 w-px ${divCls}`} />
          <span className={complexityColor}>{complexity}cx</span>
          <div className={`h-2 w-px ${divCls}`} />
          <span className="text-cyan-400/90">{data.importedBy.length}↑</span>
          <span className="text-purple-400/90">{data.importsFrom.length}↓</span>
          {data.functions.length > 0 && (
            <><div className={`h-2 w-px ${divCls}`} /><span className="text-violet-400/70">{data.functions.length}fn</span></>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   FOLDER GROUP NODE
═══════════════════════════════════════════ */
function FolderGroupNode({ data }: { data: { label: string; isDark?: boolean } }) {
  const isDark = data.isDark !== false;
  return (
    <div className="w-full h-full rounded-xl" style={{
      background: isDark ? 'rgba(15,23,42,0.55)' : 'rgba(241,245,249,0.75)',
      border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`,
      backdropFilter: 'blur(4px)',
    }}>
      <div className="px-3 pt-2 flex items-center gap-1.5">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M0 2.5C0 1.4 .9 .5 2 .5h2.5L6 2h2C9.1 2 10 2.9 10 4v3.5C10 8.6 9.1 9.5 8 9.5H2C.9 9.5 0 8.6 0 7.5V2.5Z"
            fill={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'} />
        </svg>
        <span className="text-[9px] font-bold font-mono uppercase tracking-widest truncate"
          style={{ color: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.3)' }}>
          {data.label}
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   FILE DETAIL PANEL
═══════════════════════════════════════════ */
function FileDetailPanel({ file, isDark = false, onClose }: { file: FileNodeData; isDark?: boolean; onClose: () => void }) {
  const langMap = isDark ? langColors : langColorsLight;
  const defLc = isDark ? defaultLangColor : defaultLangColorLight;
  const lc = langMap[file.language?.toLowerCase()] ?? defLc;
  const complexity = file.complexity ?? 0;
  const complexityColor = complexity > 70 ? (isDark ? 'text-red-400' : 'text-red-600') : complexity > 40 ? (isDark ? 'text-amber-400' : 'text-amber-600') : (isDark ? 'text-green-400' : 'text-green-600');
  const nameCls = isDark ? 'text-white' : 'text-gray-900';
  const pathCls = isDark ? 'text-white/30' : 'text-gray-400';
  const cardCls = isDark ? 'bg-white/5' : 'bg-gray-50 border border-gray-100';
  const valCls = isDark ? 'text-white' : 'text-gray-900';
  const lblCls = isDark ? 'text-white/40' : 'text-gray-400';
  const hdrCls = isDark ? 'text-white/50' : 'text-gray-500';
  const fnPill = isDark ? 'text-violet-300 bg-violet-500/10 border-violet-500/20' : 'text-violet-600 bg-violet-50 border-violet-200';
  const fnViol = isDark ? 'text-violet-300' : 'text-violet-600';
  const cgCard = isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-100';
  const cgCaller = isDark ? 'text-cyan-300' : 'text-cyan-700';
  const cgCallee = isDark ? 'text-cyan-200' : 'text-cyan-600';
  const cgSub = isDark ? 'text-white/50' : 'text-gray-500';
  const closeCls = isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100';
  const closeIcon = isDark ? 'text-white/50' : 'text-gray-400';
  const emptyTxt = isDark ? 'text-white/20' : 'text-gray-300';
  const importCrd = isDark ? 'bg-cyan-500/10 border border-cyan-500/20' : 'bg-cyan-50 border border-cyan-200';
  const exportCrd = isDark ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-purple-50 border border-purple-200';
  const impTxtCls = isDark ? 'text-white/70' : 'text-gray-700';
  return (
    <div className="space-y-5 h-full overflow-y-auto cx-scroll pr-1">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider mb-1.5 ${lc.bg} ${lc.text} border ${lc.border}`}>{file.language}</div>
          <h2 className={`text-base font-bold break-all leading-snug ${nameCls}`}>{file.name}</h2>
          <p className={`text-[11px] font-mono mt-0.5 break-all ${pathCls}`}>{file.path}</p>
        </div>
        <button title="Close" onClick={onClose} className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${closeCls}`}>
          <X className={`w-4 h-4 ${closeIcon}`} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className={`rounded-lg p-3 text-center ${cardCls}`}>
          <div className={`text-xl font-bold ${valCls}`}>{file.linesOfCode}</div>
          <div className={`text-[10px] uppercase tracking-wide mt-0.5 ${lblCls}`}>LOC</div>
        </div>
        <div className={`rounded-lg p-3 text-center ${cardCls}`}>
          <div className={`text-xl font-bold ${complexityColor}`}>{complexity}</div>
          <div className={`text-[10px] uppercase tracking-wide mt-0.5 ${lblCls}`}>Complexity</div>
        </div>
        <div className={`rounded-lg p-3 text-center ${cardCls}`}>
          <div className={`text-xl font-bold ${fnViol}`}>{file.functions.length}</div>
          <div className={`text-[10px] uppercase tracking-wide mt-0.5 ${lblCls}`}>Functions</div>
        </div>
      </div>
      {file.functions.length > 0 && (
        <div>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${hdrCls}`}>
            <GitBranch className={`w-3.5 h-3.5 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />Functions ({file.functions.length})
          </h3>
          <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto cx-scroll">
            {file.functions.map((fn, i) => (
              <span key={i} className={`text-[11px] font-mono px-2 py-0.5 rounded border ${fnPill}`}>{fn}()</span>
            ))}
          </div>
        </div>
      )}
      {file.functionCalls && Object.keys(file.functionCalls).length > 0 && (
        <div>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${hdrCls}`}>
            <Link className="w-3.5 h-3.5 text-cyan-400" />Call Graph
          </h3>
          <div className="space-y-2 max-h-52 overflow-y-auto cx-scroll">
            {Object.entries(file.functionCalls).map(([caller, callees], i) => (
              <div key={i} className={`rounded-lg p-2.5 ${cgCard}`}>
                <div className={`text-xs font-mono font-semibold mb-1.5 ${cgCaller}`}>{caller}()</div>
                <div className="pl-3 space-y-0.5">
                  {callees.map((callee, j) => (
                    <div key={j} className={`text-[11px] font-mono flex items-center gap-1.5 ${cgSub}`}>
                      <ArrowRight className="w-2.5 h-2.5 text-cyan-400 flex-shrink-0" />
                      <span className={cgCallee}>{callee}()</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${hdrCls}`}>
          <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />Imported by ({file.importedBy.length})
        </h3>
        {file.importedBy.length === 0
          ? <p className={`text-[11px] italic ${emptyTxt}`}>Not imported by other files</p>
          : <div className="space-y-1.5">
            {file.importedBy.map((p, i) => (
              <div key={i} title={p} className={`flex items-center gap-2 rounded-lg px-2.5 py-2 ${importCrd}`}>
                <FileCode className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span className={`text-xs font-mono truncate ${impTxtCls}`}>{p.split('/').pop() ?? p}</span>
              </div>
            ))}
          </div>
        }
      </div>
      <div>
        <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${hdrCls}`}>
          <ArrowRight className="w-3.5 h-3.5 text-purple-400" />Imports ({file.importsFrom.length})
        </h3>
        {file.importsFrom.length === 0
          ? <p className={`text-[11px] italic ${emptyTxt}`}>Does not import other files</p>
          : <div className="space-y-1.5">
            {file.importsFrom.map((p, i) => (
              <div key={i} title={p} className={`flex items-center gap-2 rounded-lg px-2.5 py-2 ${exportCrd}`}>
                <FileCode className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                <span className={`text-xs font-mono truncate ${impTxtCls}`}>{p.split('/').pop() ?? p}</span>
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SERVICE NODE (ReactFlow node)
═══════════════════════════════════════════ */
function ServiceNode({ data }: { data: ServiceData }) {
  const isDark = data.isDark !== false;
  const statusConfig = {
    healthy: { bg: 'bg-green-500/10', border: 'border-green-500', text: 'text-green-500', dot: 'bg-green-500', icon: CheckCircle },
    warning: { bg: 'bg-amber-500/10', border: 'border-amber-500', text: 'text-amber-500', dot: 'bg-amber-500', icon: AlertTriangle },
    critical: { bg: 'bg-red-500/10', border: 'border-red-500', text: 'text-red-500', dot: 'bg-red-500', icon: AlertCircle },
  };
  const layerConfig = {
    edge: { label: 'API Layer', color: 'text-blue-400', bg: 'bg-blue-500/5', accent: 'bg-blue-500' },
    compute: { label: 'Business Logic', color: 'text-purple-400', bg: 'bg-purple-500/5', accent: 'bg-purple-500' },
    data: { label: 'Data Layer', color: 'text-cyan-400', bg: 'bg-cyan-500/5', accent: 'bg-cyan-500' },
  };
  const config = statusConfig[data.status];
  const layer = layerConfig[data.layer];
  const StatusIcon = config.icon;
  const width = 360;
  const fileGroups = data.files.reduce((acc, f) => {
    const ext = f.split('.').pop()?.toLowerCase() || 'other';
    acc[ext] = (acc[ext] || 0) + 1; return acc;
  }, {} as Record<string, number>);
  const fileExtIcons: Record<string, string> = {
    py: '🐍', js: '📜', ts: '📘', jsx: '⚛️', tsx: '⚛️', json: '📋', md: '📝', yml: '⚙️', yaml: '⚙️', css: '🎨', scss: '🎨', html: '🌐',
  };
  const getHealthColor = (s: number) => s >= 80
    ? { bg: 'bg-green-500', text: 'text-green-400', ring: 'ring-green-500/30' }
    : s >= 60
      ? { bg: 'bg-amber-500', text: 'text-amber-400', ring: 'ring-amber-500/30' }
      : { bg: 'bg-red-500', text: 'text-red-400', ring: 'ring-red-500/30' };
  const healthColor = getHealthColor(data.health.score);
  // Theme tokens
  const nameCls = isDark ? 'text-white' : 'text-gray-900';
  const subCls = isDark ? 'text-white/50' : 'text-gray-500';
  const labCls = isDark ? 'text-white/60' : 'text-gray-500';
  const muted40 = isDark ? 'text-white/40' : 'text-gray-400';
  const trackCls = isDark ? 'text-white/10' : 'text-gray-200';
  const panelCls = isDark ? 'bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10' : 'bg-gray-50 rounded-lg p-3 border border-gray-100';
  const rowPanelCls = isDark ? 'bg-white/5 backdrop-blur-sm rounded-lg border border-white/10' : 'bg-gray-50 rounded-lg border border-gray-100';
  const barTrack = isDark ? 'bg-white/10' : 'bg-gray-200';
  const divH = isDark ? 'bg-white/20' : 'bg-gray-200';
  const badgeCls = isDark ? 'px-2 py-1 bg-white/10 backdrop-blur-sm rounded border border-white/20 flex items-center gap-1.5 hover:bg-white/20 transition-colors' : 'px-2 py-1 bg-gray-50 rounded border border-gray-200 flex items-center gap-1.5 hover:bg-gray-100 transition-colors';
  const badgeText = isDark ? 'text-white/80' : 'text-gray-700';
  const badgeSub = isDark ? 'text-white/40' : 'text-gray-400';
  const issueTxt = isDark ? 'text-white/70' : 'text-gray-700';
  const footerDiv = isDark ? 'border-white/10' : 'border-gray-200';
  const idCls = isDark ? 'text-white/30' : 'text-gray-300';
  const healthLbl = isDark ? 'text-white/40' : 'text-gray-400';
  const depLbl = isDark ? 'text-white/60' : 'text-gray-500';
  const fileTypeLbl = isDark ? 'text-white/60' : 'text-gray-500';
  const moreText = isDark ? 'text-white/40' : 'text-gray-400';
  return (
    <div className={`rounded-xl border-2 ${config.border} backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-200 cursor-pointer group relative overflow-hidden${isDark ? '' : ' bg-white/80'}`}
      style={{ width, padding: 0 }}>
      {/* Handles: source exits at 38% of edge length, target enters at 62%
          so A→B and B→A travel on separate parallel tracks and never overlap */}
      <Handle id="s-top" type="source" position={Position.Top} style={{ left: '38%', opacity: 0, width: 1, height: 1, minWidth: 0, minHeight: 0, border: 0 }} />
      <Handle id="t-top" type="target" position={Position.Top} style={{ left: '62%', opacity: 0, width: 1, height: 1, minWidth: 0, minHeight: 0, border: 0 }} />
      <Handle id="s-bottom" type="source" position={Position.Bottom} style={{ left: '38%', opacity: 0, width: 1, height: 1, minWidth: 0, minHeight: 0, border: 0 }} />
      <Handle id="t-bottom" type="target" position={Position.Bottom} style={{ left: '62%', opacity: 0, width: 1, height: 1, minWidth: 0, minHeight: 0, border: 0 }} />
      <Handle id="s-right" type="source" position={Position.Right} style={{ top: '38%', opacity: 0, width: 1, height: 1, minWidth: 0, minHeight: 0, border: 0 }} />
      <Handle id="t-right" type="target" position={Position.Right} style={{ top: '62%', opacity: 0, width: 1, height: 1, minWidth: 0, minHeight: 0, border: 0 }} />
      <Handle id="s-left" type="source" position={Position.Left} style={{ top: '62%', opacity: 0, width: 1, height: 1, minWidth: 0, minHeight: 0, border: 0 }} />
      <Handle id="t-left" type="target" position={Position.Left} style={{ top: '38%', opacity: 0, width: 1, height: 1, minWidth: 0, minHeight: 0, border: 0 }} />
      <div className={`h-1.5 ${layer.accent}`} />
      {data.status === 'critical' && <div className="absolute inset-0 rounded-xl border-2 border-red-500 animate-ping opacity-20" />}
      <div className={`p-4 ${config.bg} ${layer.bg}`}>
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <StatusIcon className={`w-4 h-4 ${config.text}`} />
              <span className={`text-[10px] font-bold uppercase tracking-wider ${config.text}`}>{data.status}</span>
              <div className={`ml-auto px-2 py-0.5 rounded-full text-[9px] font-bold ${layer.color} ${layer.bg} border ${config.border}`}>{layer.label}</div>
            </div>
            <h3 className={`font-bold text-base mb-1 truncate ${nameCls}`}>{data.name}</h3>
            <div className={`flex items-center gap-3 text-xs ${subCls}`}>
              <span className="flex items-center gap-1"><FileCode className="w-3 h-3" />{data.metrics.file_count} files</span>
              <span className="flex items-center gap-1"><Code className="w-3 h-3" />{data.metrics.lines_of_code.toLocaleString()} LOC</span>
            </div>
          </div>
          <div className="relative flex items-center justify-center">
            <svg className="w-16 h-16 -rotate-90">
              <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" className={trackCls} />
              <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none"
                className={healthColor.text}
                strokeDasharray={`${(data.health.score / 100) * 176} 176`}
                strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-lg font-black ${healthColor.text}`}>{data.health.score}</span>
              <span className={`text-[8px] uppercase font-bold ${healthLbl}`}>Health</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className={panelCls}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] uppercase font-bold flex items-center gap-1 ${labCls}`}><Target className="w-3 h-3" />Complexity</span>
              <span className={`text-xs font-black ${data.metrics.complexity > 70 ? 'text-red-400' : data.metrics.complexity > 40 ? 'text-amber-400' : 'text-green-400'}`}>{data.metrics.complexity}</span>
            </div>
            <div className={`w-full h-2 rounded-full overflow-hidden ${barTrack}`}>
              <div className={`h-full transition-all ${data.metrics.complexity > 70 ? 'bg-gradient-to-r from-amber-500 to-red-500' : data.metrics.complexity > 40 ? 'bg-gradient-to-r from-green-500 to-amber-500' : 'bg-gradient-to-r from-blue-500 to-green-500'}`}
                style={{ width: `${data.metrics.complexity}%` }} />
            </div>
          </div>
          <div className={panelCls}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] uppercase font-bold flex items-center gap-1 ${labCls}`}><Activity className="w-3 h-3" />Error Rate</span>
              <span className={`text-xs font-black ${data.metrics.error_rate_pct > 1 ? 'text-red-400' : 'text-green-400'}`}>{data.metrics.error_rate_pct}%</span>
            </div>
            <div className={`w-full h-2 rounded-full overflow-hidden ${barTrack}`}>
              <div className={`h-full ${data.metrics.error_rate_pct > 1 ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(100, data.metrics.error_rate_pct * 20)}%` }} />
            </div>
          </div>
          <div className={panelCls}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] uppercase font-bold flex items-center gap-1 ${labCls}`}><Clock className="w-3 h-3" />P95</span>
              <span className="text-xs font-black text-blue-400">{data.metrics.p95_latency}</span>
            </div>
          </div>
          {data.tests.total > 0 && (
            <div className={panelCls}>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] uppercase font-bold flex items-center gap-1 ${labCls}`}><CheckCircle className="w-3 h-3" />Tests</span>
                <span className={`text-xs font-black ${data.tests.errors > 0 ? 'text-amber-400' : 'text-green-400'}`}>{Math.round((data.tests.passing / data.tests.total) * 100)}%</span>
              </div>
            </div>
          )}
        </div>
        <div className={`flex items-center gap-2 mb-4 p-3 ${rowPanelCls}`}>
          <GitBranch className={`w-4 h-4 ${muted40}`} />
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center gap-1.5">
              <TrendingDown className="w-3 h-3 text-blue-400" />
              <span className={`text-xs ${depLbl}`}>Depends:</span>
              <span className={`text-sm font-bold ${data.metrics.dependencies_out > 5 ? 'text-amber-400' : 'text-blue-400'}`}>{data.metrics.dependencies_out}</span>
            </div>
            <div className={`h-4 w-px ${divH}`} />
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3 text-purple-400" />
              <span className={`text-xs ${depLbl}`}>Used by:</span>
              <span className={`text-sm font-bold ${data.metrics.dependencies_in === 0 ? 'text-amber-400' : 'text-purple-400'}`}>{data.metrics.dependencies_in}</span>
            </div>
          </div>
        </div>
        {Object.keys(fileGroups).length > 0 && (
          <div className="mb-4">
            <div className={`text-[10px] uppercase font-bold mb-2 flex items-center gap-1 ${fileTypeLbl}`}>
              <FileCode className="w-3 h-3" />File Types ({data.metrics.file_count})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(fileGroups).sort(([, a], [, b]) => b - a).slice(0, 6).map(([ext, count]) => (
                <div key={ext} className={badgeCls}>
                  <span className="text-sm">{fileExtIcons[ext] || '📄'}</span>
                  <span className={`text-[10px] font-mono font-bold ${badgeText}`}>.{ext}</span>
                  <span className={`text-[10px] ${badgeSub}`}>×{count}</span>
                </div>
              ))}
              {Object.keys(fileGroups).length > 6 && <div className={`px-2 py-1 text-[10px] ${moreText}`}>+{Object.keys(fileGroups).length - 6} more</div>}
            </div>
          </div>
        )}
        {data.health.issues.length > 0 && (
          <div className="mb-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-amber-400 mb-1">{data.health.issues.length} Issue{data.health.issues.length > 1 ? 's' : ''}</div>
                <div className="space-y-1">
                  {data.health.issues.slice(0, 2).map((issue, idx) => (
                    <div key={idx} className={`text-[11px] leading-tight ${issueTxt}`}>• {issue}</div>
                  ))}
                  {data.health.issues.length > 2 && <div className="text-[10px] text-amber-400/60 font-medium">+{data.health.issues.length - 2} more</div>}
                </div>
              </div>
            </div>
          </div>
        )}
        <div className={`flex items-center justify-between pt-3 border-t ${footerDiv}`}>
          <div className={`flex items-center gap-1.5 text-[10px] ${muted40}`}>
            <Clock className="w-3 h-3" /><span>{data.last_deployment_ago}</span>
          </div>
          <div className={`flex items-center gap-1 text-[9px] ${idCls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
            <span>ID: {data.id}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SWIMLANE BACKDROP NODE
═══════════════════════════════════════════ */
const LANE_META = {
  edge: { label: 'API Layer', dot: '#60a5fa', bg: 'rgba(59,130,246,0.06)', border: 'rgba(59,130,246,0.25)' },
  compute: { label: 'Business Logic', dot: '#a78bfa', bg: 'rgba(139,92,246,0.06)', border: 'rgba(139,92,246,0.25)' },
  data: { label: 'Data Layer', dot: '#22d3ee', bg: 'rgba(6,182,212,0.06)', border: 'rgba(6,182,212,0.25)' },
};
function SwimLaneNode({ data }: { data: { lane: keyof typeof LANE_META } }) {
  const { lane } = data;
  const m = LANE_META[lane];
  const PAD = 40;

  const bounds = useStore(
    useCallback((state: any) => {
      const pts: Array<{ x: number; y: number }> = [];
      state.nodeInternals.forEach((n: any) => {
        if (n.type === 'serviceNode' && n.data?.layer === lane) pts.push(n.position);
      });
      if (!pts.length) return null;
      const xs = pts.map((p: any) => p.x);
      const ys = pts.map((p: any) => p.y);
      return {
        x: Math.min(...xs) - PAD,
        y: Math.min(...ys) - PAD,
        w: Math.max(...xs) - Math.min(...xs) + SERVICE_W + PAD * 2,
        h: Math.max(...ys) - Math.min(...ys) + SERVICE_H + PAD * 2,
      };
    }, [lane])
  );

  if (!bounds) return null;

  return (
    <div style={{
      position: 'absolute', left: bounds.x, top: bounds.y,
      width: bounds.w, height: bounds.h,
      background: m.bg, border: `1.5px solid ${m.border}`,
      borderRadius: 20, pointerEvents: 'none',
      transition: 'left 0.15s ease, top 0.15s ease, width 0.15s ease, height 0.15s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 18px' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: m.dot, boxShadow: `0 0 8px ${m.dot}` }} />
        <span style={{ color: m.dot, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{m.label}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   LAYOUT HELPERS
═══════════════════════════════════════════ */

/**
 * Service layout — keeps 3 fixed swimlane rows (edge / compute / data) but orders
 * nodes *within* each lane using the barycenter heuristic so that connected nodes
 * land close to each other and edge crossings are minimised.
 */
const SERVICE_W = 360;
const SERVICE_H = 460;
const H_GAP = 120; // horizontal gap — wide enough for edges to route through
const V_ROW_GAP = 80;  // vertical gap between rows inside a lane
const LANE_GAP = 220; // wide lane gap = routing channel between swimlanes
const MAX_PER_ROW = 3;

const getServiceLayout = (
  nodes: Node[],
  conns: Array<{ source: string; target: string }>,
): { nodes: Node[]; swimlaneNodes: Node[] } => {
  const LANES = ['edge', 'compute', 'data'] as const;
  const byLayer = new Map<string, string[]>();
  for (const lane of LANES) byLayer.set(lane, []);
  for (const n of nodes) {
    const layer = (n.data as ServiceData).layer ?? 'compute';
    byLayer.get(layer)?.push(n.id);
  }
  const nodeById = new Map(nodes.map(n => [n.id, n]));

  // Undirected adjacency
  const adj = new Map<string, Set<string>>();
  for (const n of nodes) adj.set(n.id, new Set());
  for (const { source, target } of conns) {
    adj.get(source)?.add(target);
    adj.get(target)?.add(source);
  }

  // Temporary 1-D position for barycenter computation (index within lane)
  const tempX = new Map<string, number>();
  for (const [, ids] of byLayer) ids.forEach((id, i) => tempX.set(id, i));

  // 4 passes of barycenter sorting
  for (let iter = 0; iter < 4; iter++) {
    for (const lane of LANES) {
      const ids = byLayer.get(lane)!;
      if (ids.length <= 1) continue;
      const laneSet = new Set(ids);
      const sorted = ids
        .map(id => {
          const crossNeighbors = [...(adj.get(id) ?? [])].filter(nb => !laneSet.has(nb));
          const bary = crossNeighbors.length
            ? crossNeighbors.reduce((s, nb) => s + (tempX.get(nb) ?? 0), 0) / crossNeighbors.length
            : tempX.get(id) ?? 0;
          return { id, bary };
        })
        .sort((a, b) => a.bary - b.bary);
      const reordered = sorted.map(x => x.id);
      byLayer.set(lane, reordered);
      reordered.forEach((id, i) => tempX.set(id, i));
    }
  }

  // Assign pixel positions — rows of MAX_PER_ROW, centred on x = 0
  const CANVAS_PAD = 40;
  const positionedNodes: Node[] = [];
  const swimlaneNodes: Node[] = [];
  let curY = 0;
  for (const lane of LANES) {
    const ids = byLayer.get(lane)!;
    if (ids.length === 0) continue;
    const laneStartY = curY;
    const rows = Math.ceil(ids.length / MAX_PER_ROW);
    // Compute max row width for this lane (last row may be shorter)
    const maxRowCount = Math.min(ids.length, MAX_PER_ROW);
    const maxRowW = maxRowCount * SERVICE_W + (maxRowCount - 1) * H_GAP;
    for (let row = 0; row < rows; row++) {
      const rowIds = ids.slice(row * MAX_PER_ROW, (row + 1) * MAX_PER_ROW);
      const rowW = rowIds.length * SERVICE_W + (rowIds.length - 1) * H_GAP;
      const startX = -rowW / 2;
      rowIds.forEach((id, i) => {
        positionedNodes.push({ ...nodeById.get(id)!, position: { x: startX + i * (SERVICE_W + H_GAP), y: curY } });
      });
      curY += SERVICE_H + V_ROW_GAP;
    }
    swimlaneNodes.push({
      id: `__lane_${lane}`,
      type: 'swimLane',
      position: { x: 0, y: 0 },
      data: { lane },
      draggable: false,
      selectable: false,
      zIndex: -1,
      style: { width: 1, height: 1, overflow: 'visible' },
    });
    curY += LANE_GAP;
  }
  return { nodes: positionedNodes, swimlaneNodes };
};

/** Edge colour palette — direction-aware */
const EDGE_COLOR_FORWARD = '#818cf8'; // indigo  — A→B rightward / downward
const EDGE_COLOR_REVERSE = '#2dd4bf'; // teal    — B→A leftward  / upward
const EDGE_COLOR_BLAST = '#fbbf24'; // amber   — blast radius
const EDGE_COLOR_CRITICAL = '#f87171'; // red     — critical path

/**
 * Build edges with smart handle selection:
 * - clearly above/below       → s-bottom → t-top (routes through LANE_GAP — no node bodies)
 * - same row / same layer     → s-top → t-top   (arcs ABOVE the row — no node bodies)
 * - same position loop        → s-bottom → t-bottom
 */
const buildSmartEdges = (
  laidNodes: Node[],
  connections: Array<{ source: string; target: string; isCritical: boolean; isBlast: boolean }>,
): Edge[] => {
  const posById = new Map(laidNodes.map(n => [n.id, n.position]));
  return connections.map(({ source, target, isCritical, isBlast }) => {
    const sp = posById.get(source);
    const tp = posById.get(target);
    let srcH = 'bottom', tgtH = 'top';
    if (sp && tp) {
      const dy = tp.y - sp.y;
      const SAME_ROW = Math.abs(dy) < SERVICE_H * 0.8;
      if (SAME_ROW) {
        if (Math.abs(tp.x - sp.x) < 10) {
          // Exact same position — loop under
          srcH = 'bottom'; tgtH = 'bottom';
        } else {
          // Same layer: arc ABOVE the row so the line never crosses neighbouring node bodies
          srcH = 'top'; tgtH = 'top';
        }
      } else if (dy > 0) {
        srcH = 'bottom'; tgtH = 'top';   // downward — routes through LANE_GAP
      } else {
        srcH = 'top'; tgtH = 'bottom';   // upward   — routes through LANE_GAP
      }
    }
    const isForward = srcH === 'bottom';
    const color = isCritical ? EDGE_COLOR_CRITICAL
      : isBlast ? EDGE_COLOR_BLAST
        : isForward ? EDGE_COLOR_FORWARD
          : EDGE_COLOR_REVERSE;
    return {
      id: `${source}-${target}`,
      source, target,
      sourceHandle: `s-${srcH}`,
      targetHandle: `t-${tgtH}`,
      type: 'smart' as const,
      animated: isCritical,
      style: { stroke: color, strokeWidth: isCritical ? 2.5 : 1.5, opacity: 0.8 },
      markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color },
    };
  });
};

/* ═══════════════════════════════════════════
   SMART EDGE — obstacle-avoiding path router
═══════════════════════════════════════════ */

// Rounded polyline: converts an array of [x,y] waypoints into a smooth SVG path
function polyRound(pts: [number, number][], r = 14): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1], [cx, cy] = pts[i], [nx, ny] = pts[i + 1];
    const d1 = Math.hypot(cx - px, cy - py), d2 = Math.hypot(nx - cx, ny - cy);
    if (!d1 || !d2) { d += ` L ${cx} ${cy}`; continue; }
    const cr = Math.min(r, d1 / 2, d2 / 2);
    const ax = cx - ((cx - px) / d1) * cr, ay = cy - ((cy - py) / d1) * cr;
    const bx = cx + ((nx - cx) / d2) * cr, by = cy + ((ny - cy) / d2) * cr;
    d += ` L ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`;
  }
  return d + ` L ${pts[pts.length - 1][0]} ${pts[pts.length - 1][1]}`;
}

// True if a horizontal segment at `y` between x0..x1 is free of all boxes
function hClear(
  y: number, x0: number, x1: number,
  boxes: { l: number; r: number; t: number; b: number }[],
) {
  const lo = Math.min(x0, x1), hi = Math.max(x0, x1);
  return !boxes.some(b => b.t < y && b.b > y && b.l < hi && b.r > lo);
}

function SmartEdge({
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  style, markerEnd, animated,
}: EdgeProps) {
  const obstacleSelector = useCallback((s: any) => {
    const out: { x: number; y: number; type: string }[] = [];
    s.nodeInternals.forEach((n: any) => {
      if (n.type === 'serviceNode' || n.type === 'fileNode') {
        const pos = n.positionAbsolute ?? n.position;
        out.push({ x: pos.x, y: pos.y, type: n.type });
      }
    });
    return out;
  }, []);
  const obstacles = useStore(obstacleSelector);

  const pathD = useMemo(() => {
    const PAD = 50;
    const boxes = obstacles.map(o => {
      const w = o.type === 'fileNode' ? FILE_CHIP_W : SERVICE_W;
      const h = o.type === 'fileNode' ? 52 : SERVICE_H;
      return {
        l: o.x - PAD, r: o.x + w + PAD,
        t: o.y - PAD, b: o.y + h + PAD,
      };
    });
    const sx = sourceX, sy = sourceY, tx = targetX, ty = targetY;

    // Check if a vertical segment at x is clear between y0 and y1
    function vClear(x: number, y0: number, y1: number): boolean {
      const lo = Math.min(y0, y1), hi = Math.max(y0, y1);
      return !boxes.some(b => b.l < x && b.r > x && b.t < hi && b.b > lo);
    }
    // Check if a horizontal segment at y is clear between x0 and x1
    function hClearFn(y: number, x0: number, x1: number): boolean {
      const lo = Math.min(x0, x1), hi = Math.max(x0, x1);
      return !boxes.some(b => b.t < y && b.b > y && b.l < hi && b.r > lo);
    }
    // Nearest x near nearX where a vertical segment y0→y1 is completely clear
    function findClearX(nearX: number, y0: number, y1: number): number {
      for (let off = 0; off <= 1200; off += 5) {
        if (vClear(nearX + off, y0, y1)) return nearX + off;
        if (off > 0 && vClear(nearX - off, y0, y1)) return nearX - off;
      }
      return nearX;
    }

    // Same-direction exits: arc cleanly outside the row — no nodes can live above/below
    if (sourcePosition === Position.Top && targetPosition === Position.Top) {
      const arcY = Math.min(sy, ty) - 80;
      return polyRound([[sx, sy], [sx, arcY], [tx, arcY], [tx, ty]]);
    }
    if (sourcePosition === Position.Bottom && targetPosition === Position.Bottom) {
      const arcY = Math.max(sy, ty) + 80;
      return polyRound([[sx, sy], [sx, arcY], [tx, arcY], [tx, ty]]);
    }

    // Cross-layer with guaranteed 90° exits/entries at handles.
    // Add stubs: go straight out of the source handle and straight into the target handle
    // before any horizontal turn — this guarantees the tangent at each handle is vertical.
    const STUB = 55;
    const syOut = sy + (sourcePosition === Position.Top ? -STUB : STUB); // leave handle straight
    const tyIn = ty + (targetPosition === Position.Top ? -STUB : STUB); // arrive handle straight

    // Find clear vertical channels from stub endpoints to midpoint corridor
    const midY = (syOut + tyIn) / 2;
    const srcChanX = vClear(sx, syOut, midY) ? sx : findClearX(sx, syOut, midY);
    const tgtChanX = vClear(tx, midY, tyIn) ? tx : findClearX(tx, midY, tyIn);

    // Find a clear horizontal corridor at the midpoint (search outward if blocked)
    let routeY = midY;
    if (!hClearFn(midY, srcChanX, tgtChanX)) {
      const span = Math.abs(tyIn - syOut);
      for (let off = 5; off <= span / 2; off += 5) {
        if (hClearFn(midY + off, srcChanX, tgtChanX)) { routeY = midY + off; break; }
        if (hClearFn(midY - off, srcChanX, tgtChanX)) { routeY = midY - off; break; }
      }
    }

    // Build path: vertical stub out → optional horizontal shift → vertical to corridor
    //             → horizontal cross → vertical from corridor → optional horizontal shift → vertical stub in
    const pts: [number, number][] = [[sx, sy], [sx, syOut]];
    if (srcChanX !== sx) pts.push([srcChanX, syOut]);
    pts.push([srcChanX, routeY]);
    if (srcChanX !== tgtChanX) pts.push([tgtChanX, routeY]);
    pts.push([tgtChanX, tyIn]);
    if (tgtChanX !== tx) pts.push([tx, tyIn]);
    pts.push([tx, ty]);
    return polyRound(pts);
  }, [sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, obstacles]);

  return (
    <path
      d={pathD}
      style={{ fill: 'none', ...style }}
      markerEnd={markerEnd}
      className={`react-flow__edge-path${animated ? ' animated' : ''}`}
    />
  );
}

/** Dagre layout used for the file-level drill-down view */
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, ranksep: 150, nodesep: 100, marginx: 50, marginy: 50 });
  nodes.forEach(n => {
    const w = Math.max(280, Math.min(400, 280 + (n.data as ServiceData).metrics.complexity * 1.5));
    g.setNode(n.id, { width: w, height: 280 });
  });
  edges.forEach(e => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return {
    nodes: nodes.map(n => {
      const pos = g.node(n.id);
      const w = Math.max(280, Math.min(400, 280 + (n.data as ServiceData).metrics.complexity * 1.5));
      return { ...n, position: { x: pos.x - w / 2, y: pos.y - 140 } };
    }),
    edges,
  };
};

/* ═══════════════════════════════════════════
   MAIN CONTENT
═══════════════════════════════════════════ */
function CortexPageContent() {
  const { id: repoId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Theme — use global context so it persists across pages
  const { isDarkMode: isDark, setIsDarkMode: setIsDark } = useTheme();
  const isDarkRef = useRef(false);
  isDarkRef.current = isDark;
  const bg        = isDark ? '#080a0f'             : '#eef0f4';
  const panelBg   = isDark ? 'rgba(10,12,18,0.97)' : 'rgba(255,255,255,0.97)';
  const border    = isDark ? '#1a1f2e'             : '#e5e7eb';
  const muted     = isDark ? '#4b5563'             : '#9ca3af';
  const text      = isDark ? '#f1f5f9'             : '#111827';

  // View
  const [view, setView] = useState<'graph' | 'service' | 'flow'>('graph');
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);

  // Repo identity
  const [repoName, setRepoName] = useState('');

  // Data state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<ServiceData[]>([]);
  // Full service map keyed by serviceId — used for connection target lookups
  // (avoids missing targets caused by the display filter stripping 0-LOC services)
  const allServicesById = useRef<Map<number, ServiceData>>(new Map());
  const [lastUpdated, setLastUpdated] = useState('');
  const [blastPairs, setBlastPairs] = useState<Set<string>>(new Set());
  const [criticalId, setCriticalId] = useState<number | null>(null);
  const [timelineData, setTimelineData] = useState<{ position: number; label: string; color: string }[]>([]);
  const [rebuilding, setRebuilding] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [hoveredEvent, setHoveredEvent] = useState<number | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [hideHealthy, setHideHealthy] = useState(false);
  const [filters, setFilters] = useState({ sentinel: true, fortress: true, cortex: true });
  const [layerFilters, setLayerFilters] = useState({ edge: true, compute: true, data: true });

  // Sidebar selection
  const [selectedService, setSelectedService] = useState<ServiceData | null>(null);

  // Drill-down state
  const [viewMode, setViewMode] = useState<'services' | 'files'>('services');
  const [drilledService, setDrilledService] = useState<ServiceData | null>(null);
  const [fileNodeDataList, setFileNodeDataList] = useState<FileNodeData[]>([]);
  const [fileImports, setFileImports] = useState<Array<{ from: string; to: string; count: number; functions: string[] }>>([]);
  const [selectedFileNode, setSelectedFileNode] = useState<FileNodeData | null>(null);

  // ReactFlow
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView } = useReactFlow();
  // Keep a stable ref so useEffects can call fitView without listing it as a dep
  const fitViewRef = useRef(fitView);
  useEffect(() => { fitViewRef.current = fitView; });
  const nodeTypes: NodeTypes = useMemo(() => ({ serviceNode: ServiceNode, fileNode: FileNode, swimLane: SwimLaneNode, folderGroup: FolderGroupNode }), []);
  const edgeTypes: EdgeTypes = useMemo(() => ({ smart: SmartEdge }), []);

  // Auto-fit whenever the graph is (re)loaded — fires for both service and file views.
  // 350 ms gives ReactFlow time to mount + measure node dimensions before we fit.
  const prevNodeCount = useRef(0);
  useEffect(() => {
    if (nodes.length === 0) { prevNodeCount.current = 0; return; }
    if (nodes.length === prevNodeCount.current) return; // same graph, skip
    prevNodeCount.current = nodes.length;
    const t = setTimeout(() => fitViewRef.current({ duration: 700, padding: 0.18 }), 350);
    return () => clearTimeout(t);
  }, [nodes.length]);

  // Propagate theme changes to all mounted nodes
  useEffect(() => {
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, isDark } })));
  }, [isDark, setNodes]);

  /* ── Fetch data ─────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!repoId) { setError('No repository ID provided'); setLoading(false); return; }
    const fetchData = async () => {
      setLoading(true); setError(null);
      try {
        const [res, tlRes] = await Promise.all([
          getCortexServices(repoId),
          getCortexTimeline(repoId).catch(() => ({ events: [] })),
        ]);
        getRepo(repoId).then(r => setRepoName(r.name)).catch(() => { });
        // Step 1: services that have source files
        const hasFiles = new Set(
          (res.services as any[]).filter(s => s.metrics.file_count > 0).map(s => s.id.toString())
        );
        // Step 2: also include services that are TARGETS of those — they may have 0 files
        //         (config/infra services) but are still real nodes used by others
        const referencedIds = new Set<string>();
        for (const svc of res.services as any[]) {
          if (hasFiles.has(svc.id.toString())) {
            for (const tid of svc.connections ?? []) referencedIds.add(tid.toString());
          }
        }
        const valid = (res.services as ServiceData[]).filter(
          s => hasFiles.has(s.id.toString()) || referencedIds.has(s.id.toString())
        );
        if (valid.length === 0) { setError('__NOT_GENERATED__'); setLoading(false); return; }
        // Build a full lookup map (ALL services, even those with 0 LOC) so dep-flow target
        // resolution never silently drops a connection whose target was filtered from display.
        allServicesById.current = new Map(
          (res.services as ServiceData[]).map((s: ServiceData) => [s.id, s])
        );
        setServices(valid);
        setLastUpdated(res.last_updated_ago);
        setBlastPairs(new Set((res.blast_radius_pairs || []).map((p: any) => `${p.source_id}-${p.target_id}`)));
        setCriticalId(res.critical_service_id);
        setTimelineData(((tlRes as any).events || []).map((e: any) => ({ position: e.position_pct, label: e.label, color: e.color || '#6b7280' })));

        const flowNodes: Node[] = valid.map(svc => ({ id: svc.id.toString(), type: 'serviceNode', data: svc, position: { x: 0, y: 0 } }));
        const validIds = new Set(flowNodes.map(n => n.id));
        const blastSet = new Set((res.blast_radius_pairs || []).map((p: any) => `${p.source_id}-${p.target_id}`));
        // Build connections from ALL services (not just valid) so that connections
        // from filtered-out services to visible nodes are also captured.
        // Keep only edges where both endpoints are rendered nodes.
        const rawConns = (res.services as any[]).flatMap(svc =>
          (svc.connections ?? [])
            .filter((tid: number) => validIds.has(svc.id.toString()) && validIds.has(tid.toString()))
            .map((tid: number) => ({
              source: svc.id.toString(), target: tid.toString(),
              isCritical: svc.status === 'critical',
              isBlast: blastSet.has(`${svc.id}-${tid}`),
            }))
        );
        const { nodes: serviceNodes, swimlaneNodes } = getServiceLayout(flowNodes, rawConns);
        const ln = [...swimlaneNodes, ...serviceNodes]; // swimlanes render behind service nodes
        const le = buildSmartEdges(ln.filter(n => n.type === 'serviceNode'), rawConns);
        setNodes(ln.map(n => ({ ...n, data: { ...n.data, isDark: isDarkRef.current } }))); setEdges(le); // fitView fires via nodes.length watcher above
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load services');
      } finally { setLoading(false); }
    };
    fetchData();
  }, [repoId, setNodes, setEdges]); // fitView intentionally omitted — accessed via ref

  /* ── Auto-refresh ────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!autoRefresh || !repoId || viewMode !== 'services') return;
    const iv = setInterval(async () => {
      try {
        const res = await getCortexServices(repoId);
        const hasFiles = new Set((res.services as any[]).filter(s => s.metrics.file_count > 0).map(s => s.id.toString()));
        const refIds = new Set<string>();
        for (const svc of res.services as any[]) { if (hasFiles.has(svc.id.toString())) { for (const tid of svc.connections ?? []) refIds.add(tid.toString()); } }
        const valid = (res.services as ServiceData[]).filter(s => hasFiles.has(s.id.toString()) || refIds.has(s.id.toString()));
        allServicesById.current = new Map((res.services as ServiceData[]).map((s: ServiceData) => [s.id, s]));
        setServices(valid); setLastUpdated(res.last_updated_ago);
      } catch { }
    }, 30000);
    return () => clearInterval(iv);
  }, [autoRefresh, repoId, viewMode]);

  /* ── Filtered nodes/edges ───────────────────────────────────────────── */
  const filteredNodes = useMemo(() => {
    let n = nodes;
    if (viewMode === 'services') {
      if (hideHealthy) n = n.filter(nd => nd.type !== 'serviceNode' || (nd.data as ServiceData).status !== 'healthy');
      n = n.filter(nd => nd.type !== 'serviceNode' || layerFilters[(nd.data as ServiceData).layer]);
      if (searchQuery) n = n.map(nd => nd.type !== 'serviceNode' ? nd : ({
        ...nd,
        style: { ...nd.style, opacity: (nd.data as ServiceData).name.toLowerCase().includes(searchQuery.toLowerCase()) ? 1 : 0.25 },
      }));
    }
    return n;
  }, [nodes, hideHealthy, searchQuery, viewMode, layerFilters]);

  const filteredEdges = useMemo(() => {
    const ids = new Set(filteredNodes.map(n => n.id));
    return edges.filter(e => ids.has(e.source) && ids.has(e.target));
  }, [edges, filteredNodes]);

  /* ── Handlers ───────────────────────────────────────────────────────── */
  const handleFitView = useCallback(() => fitViewRef.current({ duration: 800, padding: 0.2 }), []);
  const handleExport = useCallback(async () => {
    try {
      const { toPng } = await import('html-to-image');
      const el = document.querySelector('.react-flow') as HTMLElement;
      if (!el) return;
      const url = await toPng(el, { backgroundColor: '#020617', quality: 1 });
      const a = document.createElement('a'); a.download = `cortex-${repoId}.png`; a.href = url; a.click();
    } catch { }
  }, [repoId]);
  const handleRebuild = useCallback(async () => {
    if (!repoId || rebuilding) return;
    setRebuilding(true);
    try { await rebuildCortex(repoId); window.location.reload(); }
    catch { alert('Rebuild failed — check console.'); setRebuilding(false); }
  }, [repoId, rebuilding]);

  const backToServices = useCallback(() => {
    setViewMode('services'); setDrilledService(null); setSelectedFileNode(null);
    window.location.reload();
  }, []);

  /* ── Node click ─────────────────────────────────────────────────────── */
  const onNodeClick = useCallback(async (_: React.MouseEvent, node: Node) => {
    if (viewMode === 'services') {
      const svcData = node.data as ServiceData;
      setSelectedService(svcData);
      setDrilledService(svcData); setSelectedFileNode(null); setLoading(true);
      try {
        const res = await getCortexServiceFiles(repoId!, svcData.id);
        const rawFiles: FileNodeData[] = res.files.map((f: any) => ({
          id: f.id, name: f.name, path: f.path,
          language: f.language || f.name.split('.').pop() || 'unknown',
          linesOfCode: f.linesOfCode ?? 0, complexity: f.complexity ?? 0,
          functions: f.functions || [], functionCalls: f.functionCalls || {},
          importsFrom: f.importsFrom || [], importedBy: f.importedBy || [],
          isSelected: false,
        }));
        setFileNodeDataList(rawFiles);
        setFileImports(res.imports || []);

        // ── Folder-group grid layout ──────────────────────────────────────
        const dirMap = new Map<string, FileNodeData[]>();
        rawFiles.forEach((f: FileNodeData) => {
          const parts = f.path.replace(/\\/g, '/').split('/');
          const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '(root)';
          if (!dirMap.has(dir)) dirMap.set(dir, []);
          dirMap.get(dir)!.push(f);
        });
        const sortedDirs = Array.from(dirMap.entries()).sort(([a], [b]) => {
          const da = a.split('/').length, db = b.split('/').length;
          return da !== db ? da - db : a.localeCompare(b);
        });

        const CHIP_W = FILE_CHIP_W, CHIP_H = 52;
        const CHIP_X_GAP = 10, CHIP_Y_GAP = 8;
        const GROUP_PAD_X = 14, GROUP_PAD_TOP = 32, GROUP_PAD_BOT = 14;
        const FILE_COLS_PER_GROUP = 3;
        const GROUP_GAP_X = 24, GROUP_GAP_Y = 28;
        const GROUPS_PER_ROW = 3;

        const groupNodeArr: Node[] = [];
        const fileChipArr: Node[] = [];
        let gCol = 0, cumY = 0, rowX = 0, rowMaxH = 0;

        sortedDirs.forEach(([dir, files]) => {
          const cols = Math.min(FILE_COLS_PER_GROUP, files.length);
          const rows = Math.ceil(files.length / cols);
          const gw = cols * CHIP_W + (cols - 1) * CHIP_X_GAP + GROUP_PAD_X * 2;
          const gh = GROUP_PAD_TOP + rows * CHIP_H + (rows - 1) * CHIP_Y_GAP + GROUP_PAD_BOT;

          groupNodeArr.push({
            id: `dir-${dir}`, type: 'folderGroup',
            position: { x: rowX, y: cumY },
            style: { width: gw, height: gh, pointerEvents: 'none' as const },
            data: { label: dir.split('/').pop() || dir, isDark: isDarkRef.current },
            selectable: false, draggable: false,
          } as Node);

          files.forEach((f: FileNodeData, i: number) => {
            fileChipArr.push({
              id: f.id, type: 'fileNode',
              data: { ...f, isDark: isDarkRef.current },
              position: {
                x: GROUP_PAD_X + (i % cols) * (CHIP_W + CHIP_X_GAP),
                y: GROUP_PAD_TOP + Math.floor(i / cols) * (CHIP_H + CHIP_Y_GAP),
              },
              parentNode: `dir-${dir}`,
              extent: 'parent' as const,
            } as Node);
          });

          rowX += gw + GROUP_GAP_X;
          rowMaxH = Math.max(rowMaxH, gh);
          gCol++;
          if (gCol >= GROUPS_PER_ROW) {
            gCol = 0; cumY += rowMaxH + GROUP_GAP_Y; rowX = 0; rowMaxH = 0;
          }
        });

        const fileFlowEdges: Edge[] = (res.imports || []).map((imp: any) => ({
          id: `imp-${imp.from}-${imp.to}`, source: imp.from, target: imp.to,
          type: 'smart', animated: false,
          style: { stroke: '#7c3aed', strokeWidth: Math.min(2.5, 0.8 + (imp.count ?? 1) * 0.35), opacity: 0.7 },
          markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: '#7c3aed' },
        }));

        setNodes([...groupNodeArr, ...fileChipArr]);
        setEdges(fileFlowEdges);
        setViewMode('files'); setLoading(false);
      } catch { setLoading(false); }
    } else if (node.type === 'fileNode') {
      const clicked = fileNodeDataList.find(f => f.id === node.id);
      if (!clicked) return;
      const isAlreadySelected = clicked.id === selectedFileNode?.id;

      if (isAlreadySelected) {
        // Deselect — show everything
        setSelectedFileNode(null);
        setNodes(nds => nds.map(n => ({
          ...n,
          data: { ...n.data, isSelected: false, dimmed: false, focusRole: undefined },
          style: { ...n.style, opacity: 1 },
          zIndex: undefined,
        })));
        setEdges(eds => eds.map(e => ({ ...e, style: { ...e.style, opacity: 0.7 } })));
      } else {
        // Focus: show selected node + direct neighbours, colour-coded by direction
        setSelectedFileNode(clicked);

        // Build sets: nodes this file imports (outgoing edges), nodes that import it (incoming)
        const outgoingIds = new Set<string>(); // selected → target  (selected imports these)
        const incomingIds = new Set<string>(); // source → selected  (these import selected)
        const allEdges = edges; // capture current edges before setState
        allEdges.forEach(e => {
          if (e.source === clicked.id) outgoingIds.add(e.target);
          if (e.target === clicked.id) incomingIds.add(e.source);
        });
        const connectedIds = new Set([clicked.id, ...outgoingIds, ...incomingIds]);

        setEdges(eds => eds.map(e => {
          const isOut = e.source === clicked.id;
          const isIn  = e.target === clicked.id;
          if (isOut) return { ...e, style: { stroke: '#c084fc', strokeWidth: 1.8, opacity: 1 } };
          if (isIn)  return { ...e, style: { stroke: '#22d3ee', strokeWidth: 1.8, opacity: 1 } };
          return { ...e, style: { ...e.style, opacity: 0.06 } };
        }));

        setNodes(nds => nds.map(n => {
          if (n.type === 'folderGroup') return { ...n, style: { ...n.style, opacity: 0.35 } };
          const active = connectedIds.has(n.id);
          const focusRole: FileNodeData['focusRole'] =
            n.id === clicked.id   ? 'selected' :
            outgoingIds.has(n.id) ? 'importedBy' :  // selected imports these → they are "imported by" selected
            incomingIds.has(n.id) ? 'imports'    :  // these import selected → they "import" selected
            undefined;
          return {
            ...n,
            data: { ...n.data, isSelected: n.id === clicked.id, focusRole },
            style: { ...n.style, opacity: active ? 1 : 0.15 },
            zIndex: active ? 10 : 0,
          };
        }));
      }
    }
  }, [viewMode, repoId, setNodes, setEdges, fileNodeDataList, selectedFileNode, edges]); // fitView via ref — no dep needed

  const onConnect = useCallback((p: Connection) => setEdges(eds => addEdge(p, eds)), [setEdges]);

  /* ── Keyboard shortcuts ──────────────────────────────────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && searchQuery) { setSearchQuery(''); return; }
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === '/') { e.preventDefault(); document.querySelector<HTMLInputElement>('input[type="text"]')?.focus(); }
      if (e.key === 'f' || e.key === 'F') { e.preventDefault(); handleFitView(); }
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); window.location.reload(); }
      if (e.key === 'h' || e.key === 'H') { e.preventDefault(); setHideHealthy(p => !p); }
      if (e.key === 'e' || e.key === 'E') { e.preventDefault(); handleExport(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [searchQuery, handleFitView, handleExport]);

  /* ── STATUS DEFINITIONS ─────────────────────────────────────────────── */
  const STATUS: Record<string, { dot: string; label: string; bg: string; text: string }> = {
    healthy: { dot: '#22c55e', label: 'Healthy', bg: 'rgba(34,197,94,0.10)', text: '#22c55e' },
    warning: { dot: '#f59e0b', label: 'Degraded', bg: 'rgba(245,158,11,0.10)', text: '#f59e0b' },
    critical: { dot: '#ef4444', label: 'Failed', bg: 'rgba(239,68,68,0.10)', text: '#ef4444' },
  };

  /* ══════════════════════════════════════════════
     RENDER
  ═════════════════════════════════════════════ */
  return (
    <div className="w-full h-full" style={{ colorScheme: isDark ? 'dark' : 'light' }}>
      <style>{PAGE_CSS}</style>
      <div className="w-full h-screen flex flex-col overflow-hidden"
        style={{ backgroundColor: bg, fontFamily: "'Inter','Geist Sans',sans-serif", transition: 'background 0.3s' }}>

        {/* ══════════ TOP BAR ══════════ */}
        <div className="flex-none z-50 flex items-center justify-between px-5 h-[54px] border-b"
          style={{ backgroundColor: panelBg, borderColor: border, backdropFilter: 'blur(16px)' }}>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <img src={isDark ? darkLogoImg : lightLogoImg} alt="Velocis" className="h-7 w-auto object-contain" />
            </div>
            <div className="flex items-center gap-2 text-[13px]" style={{ color: muted }}>
              <button onClick={() => navigate('/dashboard')} className="hover:opacity-80 transition-opacity" style={{ color: muted }}>Dashboard</button>
              <span>/</span>
              <button onClick={() => navigate(`/repo/${repoId}`)} style={{ color: muted }}>{repoName || repoId || 'Repo'}</button>
              <span>/</span>
              {viewMode === 'files' && drilledService ? (
                <>
                  <button onClick={backToServices} style={{ color: muted }}>Visual Cortex</button>
                  <span>/</span>
                  <span className="font-semibold font-mono" style={{ color: text }}>{drilledService.name}</span>
                </>
              ) : (
                <span className="font-semibold font-mono" style={{ color: text }}>Visual Cortex</span>
              )}
            </div>
          </div>

          {/* View switcher */}
          <div className="hidden md:flex items-center p-[3px] rounded-lg gap-[2px]"
            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', border: `1px solid ${border}` }}>
            {(['graph', 'service', 'flow'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className="px-3.5 py-1.5 rounded-md text-[13px] font-semibold capitalize transition-all"
                style={{
                  backgroundColor: view === v ? (isDark ? '#1e2535' : '#ffffff') : 'transparent',
                  color: view === v ? text : muted,
                  boxShadow: view === v ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
                }}>
                {v === 'graph' ? 'Architecture' : v === 'service' ? 'Service Map' : 'Dep. Flow'}
              </button>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">

            <button onClick={() => setIsDark(p => !p)} title="Toggle theme" className="p-1.5 rounded-md" style={{ color: muted }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = isDark ? '#1e2535' : '#f3f4f6')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className="w-7 h-7 rounded-full flex items-center justify-center ml-1 text-xs font-bold cursor-pointer"
              style={{ backgroundColor: isDark ? '#1e2535' : '#ede9fe', color: isDark ? '#a78bfa' : '#7c3aed', border: `1px solid ${isDark ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.2)'}` }}>V</div>
          </div>
        </div>

        {/* ══════════ BODY ══════════ */}
        <div className="flex-1 flex overflow-hidden">

          {/* ── Left Sidebar ── */}
          <AnimatePresence>
            {leftPanelOpen && (
              <motion.div initial={{ x: -270 }} animate={{ x: 0 }} exit={{ x: -270 }} transition={{ duration: 0.22 }}
                className="w-[260px] flex-none border-r flex flex-col overflow-hidden z-30"
                style={{ backgroundColor: panelBg, borderColor: border }}>
                <div className="flex-1 overflow-y-auto cx-scroll p-5 space-y-6">

                  {/* Graph Controls */}
                  <div className="space-y-2">
                    <button
                      onClick={handleRebuild}
                      disabled={rebuilding}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[13px] font-semibold transition-all"
                      style={{
                        backgroundColor: isDark ? 'rgba(139,92,246,0.15)' : '#ede9fe',
                        color: '#a78bfa',
                        border: `1px solid ${isDark ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.25)'}`,
                        opacity: rebuilding ? 0.7 : 1,
                      }}>
                      <GitBranch className={`w-3.5 h-3.5 ${rebuilding ? 'cx-spin' : ''}`} />
                      {rebuilding ? 'Building…' : lastUpdated ? 'Rebuild' : 'Build'}
                    </button>
                    {[
                      { icon: hideHealthy ? Eye : EyeOff, action: () => setHideHealthy(p => !p), label: hideHealthy ? 'Show Healthy' : 'Hide Healthy', active: hideHealthy },
                      { icon: Maximize2, action: handleFitView, label: 'Fit View', active: false },
                      { icon: Download, action: handleExport, label: 'Export PNG', active: false },
                    ].map(({ icon: Icon, action, label, active }, i) => (
                      <button key={i} onClick={action}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[13px] font-semibold transition-all"
                        style={{
                          backgroundColor: active ? (isDark ? 'rgba(139,92,246,0.15)' : '#ede9fe') : (isDark ? 'rgba(139,92,246,0.08)' : '#f5f3ff'),
                          color: active ? '#a78bfa' : muted,
                          border: `1px solid ${active ? 'rgba(139,92,246,0.3)' : (isDark ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.18)')}`,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Layer Controls */}
                  <div>
                    <h3 className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: muted }}>Layer Controls</h3>
                    <div className="space-y-1.5">
                      {[
                        { key: 'edge', label: 'Edge / Gateway', color: '#6366f1' },
                        { key: 'compute', label: 'Compute Services', color: '#10b981' },
                        { key: 'data', label: 'Data / Persistence', color: '#f59e0b' },
                      ].map(l => {
                        const on = layerFilters[l.key as keyof typeof layerFilters];
                        return (
                          <label key={l.key} className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all"
                            style={{ backgroundColor: on ? (isDark ? 'rgba(255,255,255,0.03)' : '#f3f4f6') : 'transparent' }}>
                            <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                              style={{ backgroundColor: on ? l.color : 'transparent', border: `1.5px solid ${on ? l.color : (isDark ? '#374151' : '#d1d5db')}` }}>
                              {on && <CheckCircle className="w-3 h-3 text-white" />}
                            </div>
                            <input type="checkbox" checked={on} onChange={() => setLayerFilters(p => ({ ...p, [l.key]: !on }))} className="sr-only" />
                            <span className="text-[13px] font-medium" style={{ color: on ? text : muted }}>{l.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Keyboard shortcuts */}
                  <div className="rounded-xl p-3 space-y-1.5" style={{ backgroundColor: isDark ? '#0e1117' : '#f9fafb', border: `1px solid ${border}` }}>
                    <div className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: muted }}>Shortcuts</div>
                    {[['/', 'Search'], ['F', 'Fit view'], ['H', 'Hide healthy'], ['E', 'Export PNG'], ['R', 'Refresh']].map(([k, desc]) => (
                      <div key={k} className="flex items-center gap-2">
                        <kbd className="px-1.5 py-0.5 text-[10px] rounded border font-mono" style={{ backgroundColor: isDark ? '#1a1f2e' : '#e5e7eb', borderColor: border, color: text }}>{k}</kbd>
                        <span className="text-[12px]" style={{ color: muted }}>{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ══════════ MAIN VIEW AREA ══════════ */}
          <div className="flex-1 relative overflow-hidden">

            {/* Left panel toggle */}
            <button onClick={() => setLeftPanelOpen(p => !p)}
              className="absolute top-3 left-3 p-2 rounded-lg backdrop-blur-sm z-50 transition-all hover:scale-105"
              style={{ backgroundColor: isDark ? 'rgba(14,17,23,0.85)' : 'rgba(255,255,255,0.9)', border: `1px solid ${border}` }}>
              <motion.div animate={{ rotate: leftPanelOpen ? 0 : 180 }} transition={{ duration: 0.3 }}>
                <ChevronLeft className="w-4 h-4" style={{ color: muted }} />
              </motion.div>
            </button>

            {/* Loading */}
            {loading ? (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 cx-spin mb-4" style={{ color: muted }} />
                <p className="text-sm font-medium" style={{ color: muted }}>Loading Visual Cortex…</p>
              </div>

              /* Not yet generated — prompt to build */
            ) : error === '__NOT_GENERATED__' ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-8">
                <div className="max-w-sm text-center">
                  <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
                    style={{ backgroundColor: isDark ? 'rgba(139,92,246,0.12)' : 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)' }}>
                    <GitMerge className="w-8 h-8" style={{ color: '#8b5cf6' }} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: text }}>Graph Not Built Yet</h3>
                  <p className="text-sm mb-6 leading-relaxed" style={{ color: muted }}>
                    Visual Cortex hasn't mapped this repository yet. Build the graph to visualise your service architecture, dependencies, and health.
                  </p>
                  <button
                    onClick={handleRebuild}
                    disabled={rebuilding}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
                    style={{ backgroundColor: '#8b5cf6', color: '#fff', opacity: rebuilding ? 0.7 : 1 }}>
                    {rebuilding ? <Loader2 className="w-4 h-4 cx-spin" /> : <RefreshCw className="w-4 h-4" />}
                    {rebuilding ? 'Building…' : 'Build Graph'}
                  </button>
                </div>
              </div>

              /* Generic error */
            ) : error ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-8">
                <div className="max-w-md text-center">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: '#ef4444' }} />
                  <h3 className="text-lg font-semibold mb-2" style={{ color: text }}>Failed to Load Cortex</h3>
                  <p className="text-sm mb-6" style={{ color: muted }}>{error}</p>
                  <button onClick={() => window.location.reload()}
                    className="px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: '#8b5cf6', color: '#fff' }}>
                    Retry
                  </button>
                </div>
              </div>

              /* ── GRAPH VIEW (ReactFlow) ── */
            ) : view === 'graph' ? (
              <>
                <div className="absolute top-3 right-3 z-50 flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold"
                  style={{ backgroundColor: isDark ? 'rgba(14,17,23,0.87)' : 'rgba(255,255,255,0.9)', border: `1px solid ${border}`, color: muted, backdropFilter: 'blur(8px)' }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 cx-live-dot" />
                  {viewMode === 'files' && drilledService
                    ? `${drilledService.name} · ${fileNodeDataList.length} files`
                    : `Architecture Map · ${services.length} services`}
                </div>

                {viewMode === 'files' && (
                  <button onClick={backToServices}
                    className="absolute top-12 right-3 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
                    style={{ backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', backdropFilter: 'blur(8px)' }}>
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Back to Services
                  </button>
                )}

                <ReactFlow
                  nodes={filteredNodes} edges={filteredEdges}
                  onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                  onNodeClick={onNodeClick} onConnect={onConnect}
                  onPaneClick={() => {
                    if (viewMode === 'files' && selectedFileNode) {
                      setSelectedFileNode(null);
                      setNodes(nds => nds.map(n => ({
                        ...n,
                        data: { ...n.data, isSelected: false, dimmed: false, focusRole: undefined },
                        style: { ...n.style, opacity: 1 },
                        zIndex: undefined,
                      })));
                      setEdges(eds => eds.map(e => ({ ...e, style: { ...e.style, opacity: 0.7 } })));

                    }
                  }}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  minZoom={0.05} maxZoom={2}
                >
                  <Background color={isDark ? '#1a1f2e' : '#c0c4cc'} gap={16} />
                  <Controls />
                  <MiniMap nodeColor={(n) => {
                    if (viewMode === 'files') return '#7c3aed';
                    const d = n.data as ServiceData;
                    return d.status === 'critical' ? '#ef4444' : d.status === 'warning' ? '#f59e0b' : '#22c55e';
                  }} style={{ backgroundColor: isDark ? '#0e1117' : '#f3f4f6', border: `1px solid ${border}` }} />
                </ReactFlow>

                <AnimatePresence>
                  {selectedFileNode && viewMode === 'files' && (
                    <motion.div key="file-detail"
                      initial={{ x: 400, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 400, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      className={`absolute right-0 top-0 bottom-0 w-96 backdrop-blur-sm shadow-2xl z-10 p-5 border-l ${isDark ? 'bg-slate-900/98 border-white/10' : 'bg-white border-gray-200'}`}>
                      <FileDetailPanel
                        file={selectedFileNode}
                        isDark={isDark}
                        onClose={() => {
                          setSelectedFileNode(null);
                          setNodes(nds => nds.map(n => ({
                            ...n,
                            data: { ...n.data, isSelected: false, dimmed: false, focusRole: undefined },
                            style: { ...n.style, opacity: 1 },
                          })));
                          setEdges(eds => eds.map(e => ({ ...e, style: { ...e.style, opacity: 0.7 } })));

                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </>

              /* ── SERVICE MAP VIEW ── */
            ) : view === 'service' ? (
              <div className="w-full h-full overflow-auto p-8 cx-scroll" style={{ backgroundColor: bg }}>
                <div className="max-w-7xl mx-auto">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold font-mono mb-2" style={{ color: text }}>Service Map</h2>
                    <p className="text-sm font-mono" style={{ color: muted }}>Services grouped by architecture layer</p>
                  </div>
                  <div className="space-y-8">
                    {(['edge', 'compute', 'data'] as const).map(layer => {
                      const layerSvcs = services.filter(s => s.layer === layer && layerFilters[layer]);
                      if (!layerSvcs.length) return null;
                      const info = {
                        edge: { label: 'Edge / Gateway', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
                        compute: { label: 'Compute Services', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
                        data: { label: 'Data / Persistence', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
                      }[layer];
                      return (
                        <div key={layer} className="rounded-2xl p-6" style={{ backgroundColor: isDark ? '#0e1117' : '#ffffff', border: `2px solid ${isDark ? '#1a1f2e' : '#e5e7eb'}` }}>
                          <div className="flex items-center gap-3 mb-5">
                            <div className="w-1 h-8 rounded-full" style={{ backgroundColor: info.color }} />
                            <h3 className="text-lg font-bold" style={{ color: text }}>{info.label}</h3>
                            <span className="text-sm px-3 py-1 rounded-full" style={{ backgroundColor: info.bg, color: info.color }}>{layerSvcs.length} service{layerSvcs.length !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {layerSvcs.map(svc => {
                              const cfg = STATUS[svc.status];
                              const sparkC = svc.status === 'critical' ? '#ef4444' : svc.status === 'warning' ? '#f59e0b' : '#22c55e';
                              return (
                                <motion.div key={svc.id} whileHover={{ y: -4, scale: 1.02 }}
                                  onClick={() => setSelectedService(svc)}
                                  className="rounded-xl p-5 cursor-pointer transition-all"
                                  style={{ backgroundColor: isDark ? '#1a1f2e' : '#f9fafb', border: `2px solid ${selectedService?.id === svc.id ? cfg.dot : (isDark ? '#252d3d' : '#e5e7eb')}`, boxShadow: selectedService?.id === svc.id ? `0 0 0 3px ${cfg.dot}33` : 'none' }}>
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.dot, boxShadow: `0 0 8px ${cfg.dot}` }} />
                                      <h4 className="font-semibold text-sm" style={{ color: text }}>{svc.name}</h4>
                                    </div>
                                    <div className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: cfg.bg, color: cfg.text }}>{cfg.label}</div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div><div className="text-[10px] font-bold uppercase mb-1" style={{ color: muted }}>p95</div><div className="text-sm font-semibold" style={{ color: text }}>{svc.metrics.p95_latency}</div></div>
                                    <div><div className="text-[10px] font-bold uppercase mb-1" style={{ color: muted }}>Error Rate</div><div className="text-sm font-semibold" style={{ color: svc.status === 'critical' ? cfg.text : text }}>{svc.metrics.error_rate_pct}%</div></div>
                                  </div>
                                  <div className="mb-2"><Sparkline data={svc.metrics.sparkline} color={sparkC} /></div>
                                  {svc.connections.length > 0 && <div className="text-[11px]" style={{ color: muted }}>Connects to {svc.connections.length} service{svc.connections.length !== 1 ? 's' : ''}</div>}
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              /* ── DEP FLOW VIEW ── */
            ) : (
              <div className="w-full h-full overflow-auto p-8 cx-scroll" style={{ backgroundColor: bg }}>
                <div className="max-w-7xl mx-auto">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold font-mono mb-2" style={{ color: text }}>Dependency Flow</h2>
                    <p className="text-sm font-mono" style={{ color: muted }}>Data flow and service dependencies</p>
                  </div>
                  <div className="rounded-2xl p-8" style={{ backgroundColor: isDark ? '#0e1117' : '#ffffff', border: `2px solid ${isDark ? '#1a1f2e' : '#e5e7eb'}` }}>
                    {services.filter(s => s.connections.length > 0).length > 0 ? (
                      <div className="space-y-6">
                        {services.filter(s => s.connections.length > 0).map(svc => {
                          const cfg = STATUS[svc.status];
                          return (
                            <div key={svc.id} className="flex items-center gap-4">
                              <motion.div whileHover={{ scale: 1.05 }} onClick={() => setSelectedService(svc)}
                                className="flex items-center gap-3 px-5 py-3 rounded-lg cursor-pointer min-w-[200px]"
                                style={{ backgroundColor: isDark ? '#1a1f2e' : '#f9fafb', border: `2px solid ${selectedService?.id === svc.id ? cfg.dot : (isDark ? '#252d3d' : '#e5e7eb')}` }}>
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cfg.dot, boxShadow: `0 0 8px ${cfg.dot}` }} />
                                <div>
                                  <div className="font-semibold text-sm" style={{ color: text }}>{svc.name}</div>
                                  <div className="text-[10px]" style={{ color: muted }}>{svc.layer}</div>
                                </div>
                              </motion.div>
                              <div className="flex-1 flex items-center gap-2 px-4">
                                <div className="flex-1 h-0.5" style={{ backgroundColor: isDark ? '#252d3d' : '#d1d5db' }}>
                                  <motion.div className="h-full" style={{ backgroundColor: cfg.dot }} initial={{ scaleX: 0, originX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, ease: 'easeOut' }} />
                                </div>
                                <ChevronRight className="w-5 h-5" style={{ color: cfg.dot }} />
                              </div>
                              <div className="flex flex-wrap gap-2 flex-1">
                                {svc.connections.map(tid => {
                                  const tgt = allServicesById.current.get(tid) ?? services.find(s => s.id === tid); if (!tgt) return null;
                                  const tcfg = STATUS[tgt.status];
                                  return (
                                    <motion.div key={tid} whileHover={{ scale: 1.05 }} onClick={() => setSelectedService(tgt)}
                                      className="flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer"
                                      style={{ backgroundColor: isDark ? '#1a1f2e' : '#f9fafb', border: `1px solid ${selectedService?.id === tid ? tcfg.dot : (isDark ? '#252d3d' : '#e5e7eb')}` }}>
                                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tcfg.dot }} />
                                      <span className="text-xs font-medium" style={{ color: text }}>{tgt.name}</span>
                                    </motion.div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12"><p style={{ color: muted }}>No service dependencies found</p></div>
                    )}
                  </div>
                  {blastPairs.size > 0 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-6 rounded-xl p-5 flex items-start gap-4"
                      style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.3)' }}>
                      <AlertCircle className="w-6 h-6 flex-shrink-0" style={{ color: '#ef4444' }} />
                      <div>
                        <h4 className="font-semibold text-sm mb-1" style={{ color: '#ef4444' }}>Blast Radius Detected</h4>
                        <p className="text-xs" style={{ color: isDark ? '#fca5a5' : '#b91c1c' }}>
                          {blastPairs.size} connection{blastPairs.size !== 1 ? 's' : ''} affected by critical failures.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ══════════ RIGHT INSPECTOR ══════════ */}
          <AnimatePresence>
            {selectedService && view !== 'graph' && (
              <motion.div initial={{ x: 340 }} animate={{ x: 0 }} exit={{ x: 340 }} transition={{ duration: 0.22 }}
                className="w-[310px] flex-none border-l flex flex-col overflow-hidden z-30"
                style={{ backgroundColor: panelBg, borderColor: border }}>
                <div className="flex-1 overflow-y-auto cx-scroll p-5 space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-lg font-bold tracking-tight" style={{ color: text }}>{selectedService.name}</h2>
                      <button title="Close" onClick={() => setSelectedService(null)} className="p-1 rounded transition-colors" style={{ color: muted }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = isDark ? '#1e2535' : '#f3f4f6')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {(() => {
                      const cfg = STATUS[selectedService.status];
                      return (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, backgroundColor: cfg.bg, color: cfg.text }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: cfg.dot }} />{cfg.label}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="rounded-xl p-4 grid grid-cols-2 gap-3" style={{ backgroundColor: isDark ? '#0e1117' : '#f9fafb', border: `1px solid ${border}` }}>
                    {[
                      { label: 'p95 Latency', value: selectedService.metrics.p95_latency },
                      { label: 'Error Rate', value: `${selectedService.metrics.error_rate_pct}%` },
                      { label: 'LOC', value: selectedService.metrics.lines_of_code.toLocaleString() },
                      { label: 'Last Deploy', value: selectedService.last_deployment_ago },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: muted, marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: text }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  {selectedService.metrics.sparkline.length > 0 && (
                    <div className="rounded-xl p-4" style={{ backgroundColor: isDark ? '#0e1117' : '#f9fafb', border: `1px solid ${border}` }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: muted, marginBottom: 8 }}>Traffic</div>
                      <Sparkline data={selectedService.metrics.sparkline} color={selectedService.status === 'critical' ? '#ef4444' : selectedService.status === 'warning' ? '#f59e0b' : '#22c55e'} />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-3.5 h-3.5" style={{ color: '#8b5cf6' }} />
                      <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: muted }}>Sentinel Insights</h3>
                    </div>
                    {selectedService.status === 'critical' && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 8 }}>
                        <AlertCircle style={{ width: 14, height: 14, color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
                        <p style={{ fontSize: 12, lineHeight: 1.6, color: isDark ? '#fca5a5' : '#b91c1c' }}>Critical failure detected. Blast radius propagating upstream. Fortress is rerouting.</p>
                      </div>
                    )}
                    {selectedService.status === 'warning' && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 8, backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', marginBottom: 8 }}>
                        <AlertTriangle style={{ width: 14, height: 14, color: '#f59e0b', flexShrink: 0, marginTop: 1 }} />
                        <p style={{ fontSize: 12, lineHeight: 1.6, color: isDark ? '#fcd34d' : '#92400e' }}>Degraded state. Monitor error rate closely.</p>
                      </div>
                    )}
                    {selectedService.health.issues.map((issue, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#f9fafb', border: `1px solid ${border}`, marginBottom: 6 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: muted, flexShrink: 0, marginTop: 5 }} />
                        <p style={{ fontSize: 12, lineHeight: 1.6, color: muted }}>{issue}</p>
                      </div>
                    ))}
                    {selectedService.health.issues.length === 0 && selectedService.status === 'healthy' && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 8, backgroundColor: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
                        <CheckCircle style={{ width: 14, height: 14, color: '#22c55e', flexShrink: 0, marginTop: 1 }} />
                        <p style={{ fontSize: 12, lineHeight: 1.6, color: isDark ? '#86efac' : '#15803d' }}>All signals nominal. No anomalies detected.</p>
                      </div>
                    )}
                  </div>
                  {selectedService.tests.total > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <TestTube2 className="w-3.5 h-3.5" style={{ color: '#3b82f6' }} />
                        <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: muted }}>Fortress Status</h3>
                      </div>
                      <div style={{ borderRadius: 12, padding: 14, backgroundColor: isDark ? '#0e1117' : '#f9fafb', border: `1px solid ${border}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {(() => {
                          const pct = Math.round((selectedService.tests.passing / selectedService.tests.total) * 100);
                          return (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: muted }}>
                                <span>Tests passing</span>
                                <span style={{ fontWeight: 600, color: text }}>{pct}%</span>
                              </div>
                              <div style={{ height: 5, borderRadius: 999, overflow: 'hidden', backgroundColor: isDark ? '#1a1f2e' : '#e5e7eb' }}>
                                <div style={{ height: '100%', borderRadius: 999, width: `${pct}%`, backgroundColor: pct === 100 ? '#22c55e' : pct >= 90 ? '#f59e0b' : '#ef4444' }} />
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                  <div>
                    <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: muted, marginBottom: 10 }}>Dependencies</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {selectedService.connections.map(cid => {
                        const c = allServicesById.current.get(cid) ?? services.find(s => s.id === cid); if (!c) return null;
                        const ccfg = STATUS[c.status];
                        return (
                          <button key={cid} onClick={() => setSelectedService(c)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s', backgroundColor: isDark ? '#0e1117' : '#f9fafb', border: `1px solid ${border}` }}
                            onMouseEnter={e => (e.currentTarget.style.borderColor = ccfg.dot + '80')}
                            onMouseLeave={e => (e.currentTarget.style.borderColor = border)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: ccfg.dot }} />
                              <span style={{ fontSize: 13, fontWeight: 500, color: text }}>{c.name}</span>
                            </div>
                            <ChevronRight style={{ width: 14, height: 14, color: muted }} />
                          </button>
                        );
                      })}
                      {selectedService.connections.length === 0 && (
                        <p style={{ fontSize: 12, color: muted }}>No downstream dependencies</p>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setView('graph')}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer', backgroundColor: isDark ? '#f1f5f9' : '#111827', color: isDark ? '#111827' : '#f1f5f9', transition: 'opacity 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')} onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                    View in Architecture Map <ChevronRight style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ══════════ BOTTOM TIMELINE ══════════ */}
        <div className="flex-none border-t transition-colors" style={{ backgroundColor: panelBg, borderColor: border, backdropFilter: 'blur(16px)', height: '72px' }}>
          <div style={{ height: '100%', padding: '0 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: muted }}>System Activity Timeline</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 10, color: muted }}>Last 24 hours</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className="cx-live-dot" style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#ef4444' }} />
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#ef4444' }}>LIVE</span>
                </div>
              </div>
            </div>
            <div style={{ position: 'relative', height: 20 }}>
              <div style={{ position: 'absolute', inset: '50% 0', height: 2, transform: 'translateY(-50%)', borderRadius: 999, backgroundColor: isDark ? '#1a1f2e' : '#e5e7eb' }} />
              {timelineData.map((ev, i) => (
                <div key={i} style={{ position: 'absolute', top: '50%', left: `${ev.position}%`, transform: 'translate(-50%,-50%)', zIndex: 2, cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredEvent(i)} onMouseLeave={() => setHoveredEvent(null)}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: ev.color, boxShadow: `0 0 10px ${ev.color}99`, border: `2px solid ${isDark ? '#080a0f' : '#eef0f4'}`, transition: 'transform 0.15s', transform: hoveredEvent === i ? 'scale(1.6)' : 'scale(1)' }} />
                  {hoveredEvent === i && (
                    <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 20, backgroundColor: isDark ? '#1a1f2e' : '#111827', color: ev.color, border: `1px solid ${ev.color}44`, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                      {ev.label}
                      <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `5px solid ${isDark ? '#1a1f2e' : '#111827'}` }} />
                    </div>
                  )}
                </div>
              ))}
              {timelineData.length === 0 && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 10, color: muted }}>No timeline events — rebuild to generate activity</div>
              )}
              <div className="cx-live-dot" style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ef4444', boxShadow: '0 0 10px rgba(239,68,68,0.8)' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   EXPORT
═══════════════════════════════════════════ */
export function CortexPage() {
  return (
    <ReactFlowProvider>
      <CortexPageContent />
    </ReactFlowProvider>
  );
}
