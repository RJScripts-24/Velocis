"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import ReactFlow, {
  Node, Edge, Background, Controls, MiniMap,
  useNodesState, useEdgesState, MarkerType, NodeTypes,
  Connection, addEdge, Handle, Position, useReactFlow, ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../../lib/theme';
import {
  ChevronLeft, ChevronRight, Search, Shield, TestTube2, Eye, EyeOff,
  RefreshCw, Maximize2, AlertCircle, CheckCircle, AlertTriangle,
  Loader2, Sun, Moon, Clock, Code, FileCode, Activity, TrendingUp,
  TrendingDown, GitBranch, Target, Download, Play, Pause, Filter,
  ArrowRight, ArrowLeft, Link, X,
} from 'lucide-react';
import {
  getCortexServices, getCortexServiceFiles, getCortexTimeline,
  rebuildCortex,
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
  typescript: { bg: 'bg-blue-500/15',   text: 'text-blue-300',   border: 'border-blue-500/40'   },
  javascript: { bg: 'bg-yellow-500/15', text: 'text-yellow-300', border: 'border-yellow-500/40' },
  python:     { bg: 'bg-green-500/15',  text: 'text-green-300',  border: 'border-green-500/40'  },
  css:        { bg: 'bg-pink-500/15',   text: 'text-pink-300',   border: 'border-pink-500/40'   },
  html:       { bg: 'bg-orange-500/15', text: 'text-orange-300', border: 'border-orange-500/40' },
  json:       { bg: 'bg-slate-500/15',  text: 'text-slate-300',  border: 'border-slate-500/40'  },
};
const defaultLangColor = { bg: 'bg-slate-500/15', text: 'text-slate-300', border: 'border-slate-500/40' };

/* ═══════════════════════════════════════════
   FILE NODE (ReactFlow node)
═══════════════════════════════════════════ */
function FileNode({ data }: { data: FileNodeData }) {
  const lc = langColors[data.language?.toLowerCase()] ?? defaultLangColor;
  const complexity = data.complexity ?? 0;
  const complexityColor = complexity > 70 ? 'text-red-400' : complexity > 40 ? 'text-amber-400' : 'text-green-400';
  const complexityBg    = complexity > 70 ? 'bg-red-500'  : complexity > 40 ? 'bg-amber-500'    : 'bg-green-500';
  return (
    <div
      className={`relative rounded-xl border-2 backdrop-blur-sm shadow-xl transition-all duration-150 cursor-pointer
        ${data.isSelected
          ? 'border-violet-400 shadow-violet-500/30 ring-2 ring-violet-400/30'
          : 'border-white/20 hover:border-white/40 hover:shadow-2xl'}`}
      style={{ width: 250 }}
    >
      <Handle type="target" position={Position.Left}  className="!w-2.5 !h-2.5 !bg-cyan-400 !border-2 !border-slate-900" />
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-cyan-400 !border-2 !border-slate-900" />
      <div className={`h-1 rounded-t-xl ${complexity > 70 ? 'bg-gradient-to-r from-red-500 to-orange-500' : complexity > 40 ? 'bg-gradient-to-r from-amber-500 to-yellow-500' : 'bg-gradient-to-r from-blue-500 to-cyan-500'}`} />
      <div className="bg-slate-900/90 p-4 rounded-b-xl">
        <div className="flex items-start gap-2 mb-2">
          <div className={`mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex-shrink-0 ${lc.bg} ${lc.text} border ${lc.border}`}>
            {data.language || 'file'}
          </div>
          <span className="text-sm font-semibold text-white leading-tight break-all">{data.name}</span>
        </div>
        <div className="text-[10px] text-white/25 font-mono truncate mb-3" title={data.path}>{data.path}</div>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center gap-1 text-xs text-white/50">
            <Code className="w-3 h-3" /><span>{data.linesOfCode} LOC</span>
          </div>
          <div className="h-3 w-px bg-white/10" />
          <div className={`flex items-center gap-1 text-xs ${complexityColor}`}>
            <Target className="w-3 h-3" /><span>{complexity}</span>
          </div>
          {data.functions.length > 0 && (
            <>
              <div className="h-3 w-px bg-white/10" />
              <div className="flex items-center gap-1 text-xs text-violet-300">
                <GitBranch className="w-3 h-3" /><span>{data.functions.length} fn</span>
              </div>
            </>
          )}
        </div>
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-3">
          <div className={`h-full rounded-full ${complexityBg}`} style={{ width: `${Math.min(100, complexity)}%` }} />
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <div className="flex items-center gap-1 text-cyan-400">
            <ArrowLeft className="w-3 h-3" /><span>{data.importedBy.length} importing this</span>
          </div>
          <div className="h-3 w-px bg-white/10" />
          <div className="flex items-center gap-1 text-purple-400">
            <ArrowRight className="w-3 h-3" /><span>{data.importsFrom.length} imports</span>
          </div>
        </div>
        {data.functions.length > 0 && (
          <div className="mt-3 pt-2 border-t border-white/5 flex flex-wrap gap-1">
            {data.functions.slice(0, 3).map((fn, i) => (
              <span key={i} className="text-[9px] font-mono text-violet-300 bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/20">{fn}()</span>
            ))}
            {data.functions.length > 3 && <span className="text-[9px] text-white/30">+{data.functions.length - 3}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   FILE DETAIL PANEL
═══════════════════════════════════════════ */
function FileDetailPanel({ file, onClose }: { file: FileNodeData; onClose: () => void }) {
  const lc = langColors[file.language?.toLowerCase()] ?? defaultLangColor;
  const complexity = file.complexity ?? 0;
  const complexityColor = complexity > 70 ? 'text-red-400' : complexity > 40 ? 'text-amber-400' : 'text-green-400';
  return (
    <div className="space-y-5 h-full overflow-y-auto cx-scroll pr-1">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider mb-1.5 ${lc.bg} ${lc.text} border ${lc.border}`}>{file.language}</div>
          <h2 className="text-base font-bold text-white break-all leading-snug">{file.name}</h2>
          <p className="text-[11px] text-white/30 font-mono mt-0.5 break-all">{file.path}</p>
        </div>
        <button title="Close" onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 flex-shrink-0 mt-0.5">
          <X className="w-4 h-4 text-white/50" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-white">{file.linesOfCode}</div>
          <div className="text-[10px] text-white/40 uppercase tracking-wide mt-0.5">LOC</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className={`text-xl font-bold ${complexityColor}`}>{complexity}</div>
          <div className="text-[10px] text-white/40 uppercase tracking-wide mt-0.5">Complexity</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-violet-300">{file.functions.length}</div>
          <div className="text-[10px] text-white/40 uppercase tracking-wide mt-0.5">Functions</div>
        </div>
      </div>
      {file.functions.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-violet-400" />Functions ({file.functions.length})
          </h3>
          <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto cx-scroll">
            {file.functions.map((fn, i) => (
              <span key={i} className="text-[11px] font-mono text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">{fn}()</span>
            ))}
          </div>
        </div>
      )}
      {file.functionCalls && Object.keys(file.functionCalls).length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Link className="w-3.5 h-3.5 text-cyan-400" />Call Graph
          </h3>
          <div className="space-y-2 max-h-52 overflow-y-auto cx-scroll">
            {Object.entries(file.functionCalls).map(([caller, callees], i) => (
              <div key={i} className="bg-white/5 rounded-lg p-2.5 border border-white/10">
                <div className="text-xs font-mono text-cyan-300 font-semibold mb-1.5">{caller}()</div>
                <div className="pl-3 space-y-0.5">
                  {callees.map((callee, j) => (
                    <div key={j} className="text-[11px] font-mono flex items-center gap-1.5 text-white/50">
                      <ArrowRight className="w-2.5 h-2.5 text-cyan-400 flex-shrink-0" />
                      <span className="text-cyan-200">{callee}()</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />Imported by ({file.importedBy.length})
        </h3>
        {file.importedBy.length === 0
          ? <p className="text-[11px] text-white/20 italic">Not imported by other files</p>
          : <div className="space-y-1.5">
              {file.importedBy.map((p, i) => (
                <div key={i} title={p} className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-2.5 py-2">
                  <FileCode className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                  <span className="text-xs text-white/70 font-mono truncate">{p.split('/').pop() ?? p}</span>
                </div>
              ))}
            </div>
        }
      </div>
      <div>
        <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <ArrowRight className="w-3.5 h-3.5 text-purple-400" />Imports ({file.importsFrom.length})
        </h3>
        {file.importsFrom.length === 0
          ? <p className="text-[11px] text-white/20 italic">Does not import other files</p>
          : <div className="space-y-1.5">
              {file.importsFrom.map((p, i) => (
                <div key={i} title={p} className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-lg px-2.5 py-2">
                  <FileCode className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                  <span className="text-xs text-white/70 font-mono truncate">{p.split('/').pop() ?? p}</span>
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
  const statusConfig = {
    healthy:  { bg: 'bg-green-500/10',  border: 'border-green-500',  text: 'text-green-500',  dot: 'bg-green-500',  icon: CheckCircle  },
    warning:  { bg: 'bg-amber-500/10',  border: 'border-amber-500',  text: 'text-amber-500',  dot: 'bg-amber-500',  icon: AlertTriangle },
    critical: { bg: 'bg-red-500/10',    border: 'border-red-500',    text: 'text-red-500',    dot: 'bg-red-500',    icon: AlertCircle  },
  };
  const layerConfig = {
    edge:    { label: 'API Layer',       color: 'text-blue-400',   bg: 'bg-blue-500/5',   accent: 'bg-blue-500'   },
    compute: { label: 'Business Logic',  color: 'text-purple-400', bg: 'bg-purple-500/5', accent: 'bg-purple-500' },
    data:    { label: 'Data Layer',      color: 'text-cyan-400',   bg: 'bg-cyan-500/5',   accent: 'bg-cyan-500'   },
  };
  const config = statusConfig[data.status];
  const layer  = layerConfig[data.layer];
  const StatusIcon = config.icon;
  const width = 360; // Fixed width matches SERVICE_W layout constant → no overlap
  const fileGroups = data.files.reduce((acc, f) => {
    const ext = f.split('.').pop()?.toLowerCase() || 'other';
    acc[ext] = (acc[ext] || 0) + 1; return acc;
  }, {} as Record<string, number>);
  const fileExtIcons: Record<string, string> = {
    py:'🐍',js:'📜',ts:'📘',jsx:'⚛️',tsx:'⚛️',json:'📋',md:'📝',yml:'⚙️',yaml:'⚙️',css:'🎨',scss:'🎨',html:'🌐',
  };
  const getHealthColor = (s: number) => s >= 80
    ? { bg:'bg-green-500', text:'text-green-400', ring:'ring-green-500/30' }
    : s >= 60
    ? { bg:'bg-amber-500', text:'text-amber-400', ring:'ring-amber-500/30' }
    : { bg:'bg-red-500',   text:'text-red-400',   ring:'ring-red-500/30'   };
  const healthColor = getHealthColor(data.health.score);
  return (
    <div className={`rounded-xl border-2 ${config.border} backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-200 cursor-pointer group relative overflow-hidden`}
         style={{ width, padding: 0 }}>
      {/* Handles: source exits at 38% of edge length, target enters at 62%
          so A→B and B→A travel on separate parallel tracks and never overlap */}
      <Handle id="s-top"    type="source" position={Position.Top}    style={{ left: '38%',  opacity: 0, width: 1, height: 1, minWidth: 0, minHeight: 0, border: 0 }} />
      <Handle id="t-top"    type="target" position={Position.Top}    style={{ left: '62%',  opacity: 0, width: 1, height: 1, minWidth: 0, minHeight: 0, border: 0 }} />
      <Handle id="s-bottom" type="source" position={Position.Bottom} style={{ left: '38%',  opacity: 0, width: 1, height: 1, minWidth: 0, minHeight: 0, border: 0 }} />
      <Handle id="t-bottom" type="target" position={Position.Bottom} style={{ left: '62%',  opacity: 0, width: 1, height: 1, minWidth: 0, minHeight: 0, border: 0 }} />
      <Handle id="s-right"  type="source" position={Position.Right}  style={{ top: '38%',   opacity: 0, width: 1, height: 1, minWidth: 0, minHeight: 0, border: 0 }} />
      <Handle id="t-right"  type="target" position={Position.Right}  style={{ top: '62%',   opacity: 0, width: 1, height: 1, minWidth: 0, minHeight: 0, border: 0 }} />
      <Handle id="s-left"   type="source" position={Position.Left}   style={{ top: '62%',   opacity: 0, width: 1, height: 1, minWidth: 0, minHeight: 0, border: 0 }} />
      <Handle id="t-left"   type="target" position={Position.Left}   style={{ top: '38%',   opacity: 0, width: 1, height: 1, minWidth: 0, minHeight: 0, border: 0 }} />
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
            <h3 className="font-bold text-base text-white mb-1 truncate">{data.name}</h3>
            <div className="flex items-center gap-3 text-xs text-white/50">
              <span className="flex items-center gap-1"><FileCode className="w-3 h-3" />{data.metrics.file_count} files</span>
              <span className="flex items-center gap-1"><Code className="w-3 h-3" />{data.metrics.lines_of_code.toLocaleString()} LOC</span>
            </div>
          </div>
          <div className="relative flex items-center justify-center">
            <svg className="w-16 h-16 -rotate-90">
              <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" className="text-white/10" />
              <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none"
                className={healthColor.text}
                strokeDasharray={`${(data.health.score / 100) * 176} 176`}
                strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-lg font-black ${healthColor.text}`}>{data.health.score}</span>
              <span className="text-[8px] text-white/40 uppercase font-bold">Health</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-white/60 uppercase font-bold flex items-center gap-1"><Target className="w-3 h-3" />Complexity</span>
              <span className={`text-xs font-black ${data.metrics.complexity > 70 ? 'text-red-400' : data.metrics.complexity > 40 ? 'text-amber-400' : 'text-green-400'}`}>{data.metrics.complexity}</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div className={`h-full transition-all ${data.metrics.complexity > 70 ? 'bg-gradient-to-r from-amber-500 to-red-500' : data.metrics.complexity > 40 ? 'bg-gradient-to-r from-green-500 to-amber-500' : 'bg-gradient-to-r from-blue-500 to-green-500'}`}
                   style={{ width: `${data.metrics.complexity}%` }} />
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-white/60 uppercase font-bold flex items-center gap-1"><Activity className="w-3 h-3" />Error Rate</span>
              <span className={`text-xs font-black ${data.metrics.error_rate_pct > 1 ? 'text-red-400' : 'text-green-400'}`}>{data.metrics.error_rate_pct}%</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div className={`h-full ${data.metrics.error_rate_pct > 1 ? 'bg-red-500' : 'bg-green-500'}`}
                   style={{ width: `${Math.min(100, data.metrics.error_rate_pct * 20)}%` }} />
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/60 uppercase font-bold flex items-center gap-1"><Clock className="w-3 h-3" />P95</span>
              <span className="text-xs font-black text-blue-400">{data.metrics.p95_latency}</span>
            </div>
          </div>
          {data.tests.total > 0 && (
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/60 uppercase font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3" />Tests</span>
                <span className={`text-xs font-black ${data.tests.errors > 0 ? 'text-amber-400' : 'text-green-400'}`}>{Math.round((data.tests.passing / data.tests.total) * 100)}%</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mb-4 p-3 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
          <GitBranch className="w-4 h-4 text-white/40" />
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center gap-1.5">
              <TrendingDown className="w-3 h-3 text-blue-400" />
              <span className="text-xs text-white/60">Depends:</span>
              <span className={`text-sm font-bold ${data.metrics.dependencies_out > 5 ? 'text-amber-400' : 'text-blue-400'}`}>{data.metrics.dependencies_out}</span>
            </div>
            <div className="h-4 w-px bg-white/20" />
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3 text-purple-400" />
              <span className="text-xs text-white/60">Used by:</span>
              <span className={`text-sm font-bold ${data.metrics.dependencies_in === 0 ? 'text-amber-400' : 'text-purple-400'}`}>{data.metrics.dependencies_in}</span>
            </div>
          </div>
        </div>
        {Object.keys(fileGroups).length > 0 && (
          <div className="mb-4">
            <div className="text-[10px] text-white/60 uppercase font-bold mb-2 flex items-center gap-1">
              <FileCode className="w-3 h-3" />File Types ({data.metrics.file_count})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(fileGroups).sort(([,a],[,b]) => b - a).slice(0, 6).map(([ext, count]) => (
                <div key={ext} className="px-2 py-1 bg-white/10 backdrop-blur-sm rounded border border-white/20 flex items-center gap-1.5 hover:bg-white/20 transition-colors">
                  <span className="text-sm">{fileExtIcons[ext] || '📄'}</span>
                  <span className="text-[10px] font-mono font-bold text-white/80">.{ext}</span>
                  <span className="text-[10px] text-white/40">×{count}</span>
                </div>
              ))}
              {Object.keys(fileGroups).length > 6 && <div className="px-2 py-1 text-[10px] text-white/40">+{Object.keys(fileGroups).length - 6} more</div>}
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
                    <div key={idx} className="text-[11px] text-white/70 leading-tight">• {issue}</div>
                  ))}
                  {data.health.issues.length > 2 && <div className="text-[10px] text-amber-400/60 font-medium">+{data.health.issues.length - 2} more</div>}
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <div className="flex items-center gap-1.5 text-[10px] text-white/40">
            <Clock className="w-3 h-3" /><span>{data.last_deployment_ago}</span>
          </div>
          <div className="flex items-center gap-1 text-[9px] text-white/30">
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
  edge:    { label: 'API Layer',      dot: '#60a5fa', bg: 'rgba(59,130,246,0.06)',  border: 'rgba(59,130,246,0.25)'  },
  compute: { label: 'Business Logic', dot: '#a78bfa', bg: 'rgba(139,92,246,0.06)', border: 'rgba(139,92,246,0.25)' },
  data:    { label: 'Data Layer',     dot: '#22d3ee', bg: 'rgba(6,182,212,0.06)',   border: 'rgba(6,182,212,0.25)'   },
};
function SwimLaneNode({ data }: { data: { lane: keyof typeof LANE_META; width: number; height: number } }) {
  const m = LANE_META[data.lane];
  return (
    <div style={{ width: data.width, height: data.height, background: m.bg,
                  border: `1.5px solid ${m.border}`, borderRadius: 20, pointerEvents: 'none' }}>
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
const SERVICE_W   = 360;
const SERVICE_H   = 460;
const H_GAP       = 120; // horizontal gap — wide enough for edges to route through
const V_ROW_GAP   = 80;  // vertical gap between rows inside a lane
const LANE_GAP    = 220; // wide lane gap = routing channel between swimlanes
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
      const rowW   = rowIds.length * SERVICE_W + (rowIds.length - 1) * H_GAP;
      const startX = -rowW / 2;
      rowIds.forEach((id, i) => {
        positionedNodes.push({ ...nodeById.get(id)!, position: { x: startX + i * (SERVICE_W + H_GAP), y: curY } });
      });
      curY += SERVICE_H + V_ROW_GAP;
    }
    const laneH = rows * SERVICE_H + (rows - 1) * V_ROW_GAP;
    const laneW = maxRowW + CANVAS_PAD * 2;
    swimlaneNodes.push({
      id: `__lane_${lane}`,
      type: 'swimLane',
      position: { x: -(maxRowW / 2) - CANVAS_PAD, y: laneStartY - CANVAS_PAD },
      data: { lane, width: laneW, height: laneH + CANVAS_PAD * 2 },
      draggable: false,
      selectable: false,
      zIndex: -1,
    });
    curY += LANE_GAP;
  }
  return { nodes: positionedNodes, swimlaneNodes };
};

/** Edge colour palette — direction-aware */
const EDGE_COLOR_FORWARD  = '#818cf8'; // indigo  — A→B rightward / downward
const EDGE_COLOR_REVERSE  = '#2dd4bf'; // teal    — B→A leftward  / upward
const EDGE_COLOR_BLAST    = '#fbbf24'; // amber   — blast radius
const EDGE_COLOR_CRITICAL = '#f87171'; // red     — critical path

/**
 * Build edges with smart handle selection:
 * - clearly above/below       → s-bottom → t-top  (or s-top → t-bottom)
 * - same row, source left     → s-right  → t-left  (clean horizontal)
 * - same row, source right    → s-left   → t-right
 * - same row, same X          → s-bottom → t-bottom (loop under via lane gap)
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
      const dx = tp.x - sp.x;
      const SAME_ROW = Math.abs(dy) < SERVICE_H * 0.8;
      if (SAME_ROW) {
        if (Math.abs(dx) < 10) {
          // Same position — loop under
          srcH = 'bottom'; tgtH = 'bottom';
        } else if (dx > 0) {
          // Target is to the right
          srcH = 'right'; tgtH = 'left';
        } else {
          // Target is to the left
          srcH = 'left'; tgtH = 'right';
        }
      } else if (dy > 0) {
        srcH = 'bottom'; tgtH = 'top';
      } else {
        srcH = 'top'; tgtH = 'bottom';
      }
    }
    const isForward = srcH === 'right' || srcH === 'bottom';
    const color = isCritical ? EDGE_COLOR_CRITICAL
               : isBlast     ? EDGE_COLOR_BLAST
               : isForward   ? EDGE_COLOR_FORWARD
               :               EDGE_COLOR_REVERSE;
    return {
      id: `${source}-${target}`,
      source, target,
      sourceHandle: `s-${srcH}`,
      targetHandle: `t-${tgtH}`,
      type: 'smoothstep' as const,
      pathOptions: { borderRadius: 16 },
      animated: isCritical,
      style: { stroke: color, strokeWidth: isCritical ? 2.5 : 1.5, opacity: 0.8 },
      markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color },
    };
  });
};

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
  const { isDarkMode: isDark, setIsDarkMode: setIsDark } = useTheme();
  const bg        = isDark ? '#080a0f'             : '#eef0f4';
  const panelBg   = isDark ? 'rgba(10,12,18,0.97)' : 'rgba(255,255,255,0.97)';
  const border    = isDark ? '#1a1f2e'             : '#e5e7eb';
  const muted     = isDark ? '#4b5563'             : '#9ca3af';
  const text      = isDark ? '#f1f5f9'             : '#111827';

  // View
  const [view, setView] = useState<'graph' | 'service' | 'flow'>('graph');
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);

  // Data state
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [services, setServices]         = useState<ServiceData[]>([]);
  // Full service map keyed by serviceId — used for connection target lookups
  // (avoids missing targets caused by the display filter stripping 0-LOC services)
  const allServicesById                   = useRef<Map<number, ServiceData>>(new Map());
  const [lastUpdated, setLastUpdated]   = useState('');
  const [blastPairs, setBlastPairs]     = useState<Set<string>>(new Set());
  const [criticalId, setCriticalId]     = useState<number | null>(null);
  const [timelineData, setTimelineData] = useState<{ position: number; label: string; color: string }[]>([]);
  const [rebuilding, setRebuilding]     = useState(false);
  const [autoRefresh, setAutoRefresh]   = useState(true);
  const [hoveredEvent, setHoveredEvent] = useState<number | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery]   = useState('');
  const [hideHealthy, setHideHealthy]   = useState(false);
  const [filters, setFilters]           = useState({ sentinel: true, fortress: true, cortex: true });
  const [layerFilters, setLayerFilters] = useState({ edge: true, compute: true, data: true });

  // Sidebar selection
  const [selectedService, setSelectedService] = useState<ServiceData | null>(null);

  // Drill-down state
  const [viewMode, setViewMode]                 = useState<'services' | 'files'>('services');
  const [drilledService, setDrilledService]     = useState<ServiceData | null>(null);
  const [fileNodeDataList, setFileNodeDataList] = useState<FileNodeData[]>([]);
  const [fileImports, setFileImports]           = useState<Array<{ from: string; to: string; count: number; functions: string[] }>>([]);
  const [selectedFileNode, setSelectedFileNode] = useState<FileNodeData | null>(null);

  // ReactFlow
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView } = useReactFlow();
  // Keep a stable ref so useEffects can call fitView without listing it as a dep
  const fitViewRef = useRef(fitView);
  useEffect(() => { fitViewRef.current = fitView; });
  const nodeTypes: NodeTypes = useMemo(() => ({ serviceNode: ServiceNode, fileNode: FileNode, swimLane: SwimLaneNode }), []);

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
        if (valid.length === 0) { setError('No services with files found. Rebuild the Cortex graph first.'); setLoading(false); return; }
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
        setNodes(ln); setEdges(le); // fitView fires via nodes.length watcher above
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
        const refIds   = new Set<string>();
        for (const svc of res.services as any[]) { if (hasFiles.has(svc.id.toString())) { for (const tid of svc.connections ?? []) refIds.add(tid.toString()); } }
        const valid = (res.services as ServiceData[]).filter(s => hasFiles.has(s.id.toString()) || refIds.has(s.id.toString()));
        allServicesById.current = new Map((res.services as ServiceData[]).map((s: ServiceData) => [s.id, s]));
        setServices(valid); setLastUpdated(res.last_updated_ago);
      } catch {}
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
  const handleFitView   = useCallback(() => fitViewRef.current({ duration: 800, padding: 0.2 }), []);
  const handleExport    = useCallback(async () => {
    try {
      const { toPng } = await import('html-to-image');
      const el = document.querySelector('.react-flow') as HTMLElement;
      if (!el) return;
      const url = await toPng(el, { backgroundColor: '#020617', quality: 1 });
      const a = document.createElement('a'); a.download = `cortex-${repoId}.png`; a.href = url; a.click();
    } catch {}
  }, [repoId]);
  const handleRebuild   = useCallback(async () => {
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
        const fileFlowNodes: Node[] = rawFiles.map(f => ({ id: f.id, type: 'fileNode', data: f, position: { x: 0, y: 0 } }));
        const fileFlowEdges: Edge[] = (res.imports || []).map((imp: any) => ({
          id: `imp-${imp.from}-${imp.to}`, source: imp.from, target: imp.to,
          type: 'smoothstep', animated: false,
          label: imp.count > 1 ? `${imp.count}x` : '',
          labelStyle: { fill: '#94a3b8', fontSize: 10, fontWeight: 600 },
          labelBgStyle: { fill: '#0f172a', fillOpacity: 0.9 },
          labelBgPadding: [3, 5] as [number, number], labelBgBorderRadius: 4,
          style: { stroke: '#7c3aed', strokeWidth: Math.min(3, 1 + imp.count * 0.4) },
          markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#7c3aed' },
        }));
        const g = new dagre.graphlib.Graph();
        g.setDefaultEdgeLabel(() => ({}));
        g.setGraph({ rankdir: 'LR', ranksep: 200, nodesep: 80, marginx: 60, marginy: 60 });
        fileFlowNodes.forEach(n => g.setNode(n.id, { width: 260, height: 210 }));
        fileFlowEdges.forEach(e => g.setEdge(e.source, e.target));
        dagre.layout(g);
        const laidOut = fileFlowNodes.map(n => { const p = g.node(n.id); return { ...n, position: { x: p.x - 130, y: p.y - 105 } }; });
        setNodes(laidOut); setEdges(fileFlowEdges);
        setViewMode('files'); setLoading(false); // fitView fires via nodes.length watcher above
      } catch { setLoading(false); }
    } else {
      const clicked = fileNodeDataList.find(f => f.id === node.id);
      if (clicked) {
        setSelectedFileNode(prev => prev?.id === clicked.id ? null : clicked);
        setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, isSelected: n.id === clicked.id } })));
      }
    }
  }, [viewMode, repoId, setNodes, setEdges, fileNodeDataList]); // fitView via ref — no dep needed

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
    healthy:  { dot: '#22c55e', label: 'Healthy',  bg: 'rgba(34,197,94,0.10)',   text: '#22c55e' },
    warning:  { dot: '#f59e0b', label: 'Degraded', bg: 'rgba(245,158,11,0.10)',  text: '#f59e0b' },
    critical: { dot: '#ef4444', label: 'Failed',   bg: 'rgba(239,68,68,0.10)',   text: '#ef4444' },
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
              <button onClick={() => navigate(`/repo/${repoId}`)} style={{ color: muted }}>{repoId ?? 'Repo'}</button>
              <span>/</span>
              {viewMode === 'files' && drilledService ? (
                <>
                  <button onClick={backToServices} style={{ color: muted }}>Visual Cortex</button>
                  <span>/</span>
                  <span className="font-semibold" style={{ color: text }}>{drilledService.name}</span>
                </>
              ) : (
                <span className="font-semibold" style={{ color: text }}>Visual Cortex</span>
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
            {autoRefresh && viewMode === 'services' && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold"
                   style={{ backgroundColor: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 cx-live-dot" />
                Sentinel Active
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: muted }} />
              <input type="text" placeholder="Search…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg text-[13px] focus:outline-none focus:ring-1 focus:ring-violet-500/40 w-36"
                style={{ backgroundColor: isDark ? '#111827' : '#f9fafb', border: `1px solid ${border}`, color: text }} />
            </div>
            {[
              { icon: hideHealthy ? Eye : EyeOff,   action: () => setHideHealthy(p => !p),  title: 'Hide Healthy (H)', active: hideHealthy },
              { icon: Maximize2,                     action: handleFitView,                   title: 'Fit View (F)',     active: false },
              { icon: Download,                      action: handleExport,                    title: 'Export PNG (E)',   active: false },
              { icon: autoRefresh ? Pause : Play,    action: () => setAutoRefresh(p => !p),  title: 'Auto-refresh',    active: autoRefresh },
              { icon: GitBranch,                     action: handleRebuild,                   title: 'Rebuild Graph',   active: rebuilding },
            ].map(({ icon: Icon, action, title, active }, i) => (
              <button key={i} onClick={action} title={title}
                className="p-1.5 rounded-md transition-colors"
                style={{ color: active ? '#a78bfa' : muted }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = isDark ? '#1e2535' : '#f3f4f6')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                <Icon className={`w-4 h-4 ${rebuilding && title === 'Rebuild Graph' ? 'cx-spin' : ''}`} />
              </button>
            ))}
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

                  {/* Agent Filters */}
                  <div>
                    <h3 className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: muted }}>Agent Filters</h3>
                    <div className="space-y-2">
                      {[
                        { key: 'sentinel', label: 'Sentinel Signals', icon: Shield,     ac: '#8b5cf6', ab: 'rgba(139,92,246,0.1)', abr: 'rgba(139,92,246,0.4)' },
                        { key: 'fortress', label: 'Fortress Failures', icon: TestTube2,  ac: '#3b82f6', ab: 'rgba(59,130,246,0.1)',  abr: 'rgba(59,130,246,0.4)'  },
                        { key: 'cortex',   label: 'Cortex Layers',     icon: Eye,        ac: '#10b981', ab: 'rgba(16,185,129,0.1)',  abr: 'rgba(16,185,129,0.4)'  },
                      ].map(f => {
                        const on = filters[f.key as keyof typeof filters];
                        return (
                          <button key={f.key} onClick={() => setFilters(p => ({ ...p, [f.key]: !on }))}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all"
                            style={{ backgroundColor: on ? f.ab : (isDark ? 'transparent' : '#f9fafb'), border: `1px solid ${on ? f.abr : border}`, color: on ? f.ac : muted }}>
                            <f.icon className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{f.label}</span>
                            {on && <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: f.ac }} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Layer Controls */}
                  <div>
                    <h3 className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: muted }}>Layer Controls</h3>
                    <div className="space-y-1.5">
                      {[
                        { key: 'edge',    label: 'Edge / Gateway',     color: '#6366f1' },
                        { key: 'compute', label: 'Compute Services',   color: '#10b981' },
                        { key: 'data',    label: 'Data / Persistence', color: '#f59e0b' },
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

                  {/* System Status */}
                  <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: isDark ? '#0e1117' : '#f9fafb', border: `1px solid ${border}` }}>
                    <div className="text-[10px] font-bold tracking-widest uppercase" style={{ color: muted }}>System Status</div>
                    {[
                      { label: 'Healthy',  count: services.filter(s => s.status === 'healthy').length,  color: '#22c55e' },
                      { label: 'Degraded', count: services.filter(s => s.status === 'warning').length,  color: '#f59e0b' },
                      { label: 'Critical', count: services.filter(s => s.status === 'critical').length, color: '#ef4444' },
                    ].map(({ label, count, color }) => (
                      <div key={label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                          <span className="text-[12px]" style={{ color: muted }}>{label}</span>
                        </div>
                        <span className="text-[13px] font-semibold" style={{ color: text }}>{count}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t space-y-1" style={{ borderColor: border }}>
                      <div className="flex items-center justify-between">
                        <span className="text-[12px]" style={{ color: muted }}>Total LOC</span>
                        <span className="text-[12px] font-semibold" style={{ color: text }}>{services.reduce((s, v) => s + v.metrics.lines_of_code, 0).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[12px]" style={{ color: muted }}>Files</span>
                        <span className="text-[12px] font-semibold" style={{ color: text }}>{services.reduce((s, v) => s + v.metrics.file_count, 0)}</span>
                      </div>
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

            /* Error */
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
                  nodeTypes={nodeTypes}
                  style={{ background: isDark ? '#080a0f' : '#eef0f4' }}
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
                      className="absolute right-0 top-0 bottom-0 w-96 bg-slate-900/98 backdrop-blur-sm border-l border-white/10 shadow-2xl z-10 p-5">
                      <FileDetailPanel
                        file={selectedFileNode}
                        onClose={() => {
                          setSelectedFileNode(null);
                          setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, isSelected: false } })));
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
                    <h2 className="text-2xl font-bold mb-2" style={{ color: text }}>Service Map</h2>
                    <p className="text-sm" style={{ color: muted }}>Services grouped by architecture layer</p>
                  </div>
                  <div className="space-y-8">
                    {(['edge', 'compute', 'data'] as const).map(layer => {
                      const layerSvcs = services.filter(s => s.layer === layer && layerFilters[layer]);
                      if (!layerSvcs.length) return null;
                      const info = {
                        edge:    { label: 'Edge / Gateway',     color: '#6366f1', bg: 'rgba(99,102,241,0.1)'  },
                        compute: { label: 'Compute Services',   color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
                        data:    { label: 'Data / Persistence', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
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
                    <h2 className="text-2xl font-bold mb-2" style={{ color: text }}>Dependency Flow</h2>
                    <p className="text-sm" style={{ color: muted }}>Data flow and service dependencies</p>
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
                        <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 10px', borderRadius:20, fontSize:12, fontWeight:600, backgroundColor:cfg.bg, color:cfg.text }}>
                          <div style={{ width:6, height:6, borderRadius:'50%', backgroundColor:cfg.dot }} />{cfg.label}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="rounded-xl p-4 grid grid-cols-2 gap-3" style={{ backgroundColor: isDark ? '#0e1117' : '#f9fafb', border: `1px solid ${border}` }}>
                    {[
                      { label: 'p95 Latency', value: selectedService.metrics.p95_latency },
                      { label: 'Error Rate',  value: `${selectedService.metrics.error_rate_pct}%` },
                      { label: 'LOC',         value: selectedService.metrics.lines_of_code.toLocaleString() },
                      { label: 'Last Deploy', value: selectedService.last_deployment_ago },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:muted, marginBottom:2 }}>{label}</div>
                        <div style={{ fontSize:14, fontWeight:600, color:text }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  {selectedService.metrics.sparkline.length > 0 && (
                    <div className="rounded-xl p-4" style={{ backgroundColor: isDark ? '#0e1117' : '#f9fafb', border: `1px solid ${border}` }}>
                      <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:muted, marginBottom:8 }}>Traffic</div>
                      <Sparkline data={selectedService.metrics.sparkline} color={selectedService.status === 'critical' ? '#ef4444' : selectedService.status === 'warning' ? '#f59e0b' : '#22c55e'} />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-3.5 h-3.5" style={{ color: '#8b5cf6' }} />
                      <h3 style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:muted }}>Sentinel Insights</h3>
                    </div>
                    {selectedService.status === 'critical' && (
                      <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:12, borderRadius:8, backgroundColor:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', marginBottom:8 }}>
                        <AlertCircle style={{ width:14, height:14, color:'#ef4444', flexShrink:0, marginTop:1 }} />
                        <p style={{ fontSize:12, lineHeight:1.6, color: isDark ? '#fca5a5' : '#b91c1c' }}>Critical failure detected. Blast radius propagating upstream. Fortress is rerouting.</p>
                      </div>
                    )}
                    {selectedService.status === 'warning' && (
                      <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:12, borderRadius:8, backgroundColor:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', marginBottom:8 }}>
                        <AlertTriangle style={{ width:14, height:14, color:'#f59e0b', flexShrink:0, marginTop:1 }} />
                        <p style={{ fontSize:12, lineHeight:1.6, color: isDark ? '#fcd34d' : '#92400e' }}>Degraded state. Monitor error rate closely.</p>
                      </div>
                    )}
                    {selectedService.health.issues.map((issue, idx) => (
                      <div key={idx} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:12, borderRadius:8, backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#f9fafb', border:`1px solid ${border}`, marginBottom:6 }}>
                        <div style={{ width:6, height:6, borderRadius:'50%', backgroundColor:muted, flexShrink:0, marginTop:5 }} />
                        <p style={{ fontSize:12, lineHeight:1.6, color:muted }}>{issue}</p>
                      </div>
                    ))}
                    {selectedService.health.issues.length === 0 && selectedService.status === 'healthy' && (
                      <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:12, borderRadius:8, backgroundColor:'rgba(34,197,94,0.06)', border:'1px solid rgba(34,197,94,0.2)' }}>
                        <CheckCircle style={{ width:14, height:14, color:'#22c55e', flexShrink:0, marginTop:1 }} />
                        <p style={{ fontSize:12, lineHeight:1.6, color: isDark ? '#86efac' : '#15803d' }}>All signals nominal. No anomalies detected.</p>
                      </div>
                    )}
                  </div>
                  {selectedService.tests.total > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <TestTube2 className="w-3.5 h-3.5" style={{ color: '#3b82f6' }} />
                        <h3 style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:muted }}>Fortress Status</h3>
                      </div>
                      <div style={{ borderRadius:12, padding:14, backgroundColor: isDark ? '#0e1117' : '#f9fafb', border:`1px solid ${border}`, display:'flex', flexDirection:'column', gap:10 }}>
                        {(() => {
                          const pct = Math.round((selectedService.tests.passing / selectedService.tests.total) * 100);
                          return (
                            <>
                              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:muted }}>
                                <span>Tests passing</span>
                                <span style={{ fontWeight:600, color:text }}>{pct}%</span>
                              </div>
                              <div style={{ height:5, borderRadius:999, overflow:'hidden', backgroundColor: isDark ? '#1a1f2e' : '#e5e7eb' }}>
                                <div style={{ height:'100%', borderRadius:999, width:`${pct}%`, backgroundColor: pct === 100 ? '#22c55e' : pct >= 90 ? '#f59e0b' : '#ef4444' }} />
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                  <div>
                    <h3 style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:muted, marginBottom:10 }}>Dependencies</h3>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {selectedService.connections.map(cid => {
                        const c = allServicesById.current.get(cid) ?? services.find(s => s.id === cid); if (!c) return null;
                        const ccfg = STATUS[c.status];
                        return (
                          <button key={cid} onClick={() => setSelectedService(c)}
                            style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', borderRadius:10, cursor:'pointer', transition:'all 0.15s', backgroundColor: isDark ? '#0e1117' : '#f9fafb', border:`1px solid ${border}` }}
                            onMouseEnter={e => (e.currentTarget.style.borderColor = ccfg.dot + '80')}
                            onMouseLeave={e => (e.currentTarget.style.borderColor = border)}>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <div style={{ width:6, height:6, borderRadius:'50%', backgroundColor:ccfg.dot }} />
                              <span style={{ fontSize:13, fontWeight:500, color:text }}>{c.name}</span>
                            </div>
                            <ChevronRight style={{ width:14, height:14, color:muted }} />
                          </button>
                        );
                      })}
                      {selectedService.connections.length === 0 && (
                        <p style={{ fontSize:12, color:muted }}>No downstream dependencies</p>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setView('graph')}
                    style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'10px 16px', borderRadius:10, fontWeight:600, fontSize:13, cursor:'pointer', backgroundColor: isDark ? '#f1f5f9' : '#111827', color: isDark ? '#111827' : '#f1f5f9', transition:'opacity 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')} onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                    View in Architecture Map <ChevronRight style={{ width:16, height:16 }} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ══════════ BOTTOM TIMELINE ══════════ */}
        <div className="flex-none border-t transition-colors" style={{ backgroundColor: panelBg, borderColor: border, backdropFilter:'blur(16px)', height:'72px' }}>
          <div style={{ height:'100%', padding:'0 24px', display:'flex', flexDirection:'column', justifyContent:'center', gap:8 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:muted }}>System Activity Timeline</span>
              <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                <span style={{ fontSize:10, color:muted }}>Last 24 hours</span>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div className="cx-live-dot" style={{ width:6, height:6, borderRadius:'50%', backgroundColor:'#ef4444' }} />
                  <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'#ef4444' }}>LIVE</span>
                </div>
              </div>
            </div>
            <div style={{ position:'relative', height:20 }}>
              <div style={{ position:'absolute', inset:'50% 0', height:2, transform:'translateY(-50%)', borderRadius:999, backgroundColor: isDark ? '#1a1f2e' : '#e5e7eb' }} />
              {timelineData.map((ev, i) => (
                <div key={i} style={{ position:'absolute', top:'50%', left:`${ev.position}%`, transform:'translate(-50%,-50%)', zIndex:2, cursor:'pointer' }}
                     onMouseEnter={() => setHoveredEvent(i)} onMouseLeave={() => setHoveredEvent(null)}>
                  <div style={{ width:10, height:10, borderRadius:'50%', backgroundColor:ev.color, boxShadow:`0 0 10px ${ev.color}99`, border:`2px solid ${isDark ? '#080a0f' : '#eef0f4'}`, transition:'transform 0.15s', transform: hoveredEvent === i ? 'scale(1.6)' : 'scale(1)' }} />
                  {hoveredEvent === i && (
                    <div style={{ position:'absolute', bottom:'calc(100% + 8px)', left:'50%', transform:'translateX(-50%)', padding:'5px 10px', borderRadius:7, fontSize:11, fontWeight:600, whiteSpace:'nowrap', pointerEvents:'none', zIndex:20, backgroundColor: isDark ? '#1a1f2e' : '#111827', color:ev.color, border:`1px solid ${ev.color}44`, boxShadow:'0 4px 20px rgba(0,0,0,0.4)' }}>
                      {ev.label}
                      <div style={{ position:'absolute', top:'100%', left:'50%', transform:'translateX(-50%)', borderLeft:'5px solid transparent', borderRight:'5px solid transparent', borderTop:`5px solid ${isDark ? '#1a1f2e' : '#111827'}` }} />
                    </div>
                  )}
                </div>
              ))}
              {timelineData.length === 0 && (
                <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', fontSize:10, color:muted }}>No timeline events — rebuild to generate activity</div>
              )}
              <div className="cx-live-dot" style={{ position:'absolute', right:0, top:'50%', transform:'translateY(-50%)', width:8, height:8, borderRadius:'50%', backgroundColor:'#ef4444', boxShadow:'0 0 10px rgba(239,68,68,0.8)' }} />
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
