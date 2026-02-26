"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TestTube2, RefreshCw, Pause, Maximize2, Target, RotateCcw, Download, Grid3x3, CheckCircle, AlertCircle, Play, Code, Cpu, FileSearch, Wrench, X, Activity, Clock, Sun, Moon } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';

type NodeState = 'idle' | 'running' | 'success' | 'failed';
type PipelineMode = 'live' | 'recent' | 'historical';

interface PipelineNode {
  id: string;
  label: string;
  icon: any;
  state: NodeState;
  duration?: string;
  description?: string;
}

const pipelineSteps: PipelineNode[] = [
  { id: 'push', label: 'Code Pushed', icon: Code, state: 'success', duration: '0s', description: 'Commit detected from main branch' },
  { id: 'llama', label: 'Llama 3 Writes Test', icon: Cpu, state: 'success', duration: '4.2s', description: 'AI-generated test case based on code changes' },
  { id: 'test', label: 'Test Execution', icon: TestTube2, state: 'failed', duration: '2.1s', description: 'Running test suite against new code' },
  { id: 'claude', label: 'Claude Analyzes Error', icon: FileSearch, state: 'running', duration: '3.8s', description: 'Analyzing failure patterns and root cause' },
  { id: 'fix', label: 'Auto Code Fix', icon: Wrench, state: 'idle', description: 'Generating automated fix based on analysis' },
  { id: 'rerun', label: 'Test Re-run', icon: RotateCcw, state: 'idle', description: 'Validating fix with test suite' },
  { id: 'pass', label: 'Test Pass', icon: CheckCircle, state: 'idle', description: 'Self-healing loop completed successfully' }
];

export function PipelinePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [mode, setMode] = useState<PipelineMode>('live');
  const [selectedNode, setSelectedNode] = useState<string | null>('claude');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [nodes, setNodes] = useState<PipelineNode[]>(pipelineSteps);

  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Apply dark class to an enclosing wrapper
  const themeClass = isDarkMode ? 'dark' : '';

  const repoName = id === 'infrazero' ? 'InfraZero' :
    id === 'immersa' ? 'Immersa' :
      id === 'velocis-core' ? 'velocis-core' :
        id === 'ai-observatory' ? 'ai-observatory' :
          id === 'distributed-lab' ? 'distributed-lab' :
            'test-sandbox';

  const selectedNodeData = nodes.find(n => n.id === selectedNode);

  const getStateStyles = (state: NodeState) => {
    switch (state) {
      case 'success':
        return 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400';
      case 'running':
        return 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
      case 'failed':
        return 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'border-gray-200 bg-white text-gray-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500';
    }
  };

  const getIconColor = (state: NodeState) => {
    switch (state) {
      case 'success': return 'text-green-600 dark:text-green-400';
      case 'running': return 'text-blue-600 dark:text-blue-400';
      case 'failed': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-400 dark:text-zinc-500';
    }
  };

  const recentRuns = [
    { status: 'success', time: '2m ago' },
    { status: 'success', time: '8m ago' },
    { status: 'success', time: '15m ago' },
    { status: 'failed', time: '23m ago' },
    { status: 'success', time: '35m ago' },
    { status: 'success', time: '42m ago' },
    { status: 'success', time: '1h ago' },
    { status: 'success', time: '1h ago' }
  ];

  return (
    <div className={`${themeClass} w-full h-full`}>
      <div className="min-h-screen flex flex-col font-sans bg-slate-50 dark:bg-[#010308] text-gray-900 dark:text-gray-100 transition-colors duration-300">

        {/* Pipeline Top Bar */}
        <div className="border-b h-[60px] flex items-center justify-between px-6 bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 shadow-sm z-10 transition-colors duration-300">

          {/* Left - Breadcrumb */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md flex items-center justify-center bg-gray-900 dark:bg-white transition-colors">
                <span className="text-white dark:text-gray-900 font-bold text-sm">V</span>
              </div>
              <span className="font-bold">Velocis</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-zinc-400">
              <button
                onClick={() => navigate('/dashboard')}
                className="hover:text-gray-900 dark:hover:text-white transition-colors font-medium"
              >
                Dashboard
              </button>
              <span>/</span>
              <button
                onClick={() => navigate(`/repo/${id}`)}
                className="hover:text-gray-900 dark:hover:text-white transition-colors font-medium"
              >
                {repoName}
              </button>
              <span>/</span>
              <span className="text-gray-900 dark:text-white font-medium">QA Pipeline</span>
            </div>
          </div>

          {/* Center - Mode Selector */}
          <div className="flex items-center p-1 rounded-lg bg-gray-100 dark:bg-zinc-950/50 border border-transparent dark:border-zinc-800/50">
            {(['live', 'recent', 'historical'] as const).map((modeType) => (
              <button
                key={modeType}
                onClick={() => setMode(modeType)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${mode === modeType
                  ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm ring-1 ring-gray-200 dark:ring-zinc-700/50'
                  : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300'
                  }`}
              >
                {modeType === 'live' ? 'Live Run' : modeType === 'recent' ? 'Recent Runs' : 'Historical'}
              </button>
            ))}
          </div>

          {/* Right - Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-lg text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors hidden sm:block"
            >
              {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2 rounded-lg transition-colors ${autoRefresh
                ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
                }`}
              title="Auto-refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              className="p-2 rounded-lg text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              title="Pause stream"
            >
              <Pause className="w-4 h-4" />
            </button>
            <button
              className="p-2 rounded-lg text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 ml-2 rounded-full flex items-center justify-center bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 ring-2 ring-white dark:ring-zinc-900 shadow-sm cursor-pointer hover:opacity-80 transition-opacity">
              <span className="text-sm font-bold">R</span>
            </div>
          </div>
        </div>

        {/* Pipeline Status Strip */}
        <div className="px-6 py-3 flex items-center justify-between border-b bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border-gray-200 dark:border-zinc-800 z-10 transition-colors duration-300">
          <div>
            <div className="font-semibold text-sm mb-0.5 text-gray-900 dark:text-white flex items-center gap-2">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </div>
              Fortress Autonomous QA Active
            </div>
            <div className="text-xs text-gray-500 dark:text-zinc-400 font-medium ml-4">
              Monitoring commits and executing self-healing loops
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-full flex items-center gap-1.5 bg-gray-100 dark:bg-zinc-800 border border-gray-200/50 dark:border-zinc-700/50 shadow-sm">
              <Activity className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-400" />
              <span className="text-xs text-gray-500 dark:text-zinc-400 font-medium">Runs today: </span>
              <span className="text-xs font-bold text-gray-900 dark:text-white">42</span>
            </div>
            <div className="px-3 py-1.5 rounded-full flex items-center gap-1.5 bg-gray-100 dark:bg-zinc-800 border border-gray-200/50 dark:border-zinc-700/50 shadow-sm">
              <CheckCircle className="w-3.5 h-3.5 text-green-500 dark:text-green-400" />
              <span className="text-xs text-gray-500 dark:text-zinc-400 font-medium">Auto-fix success: </span>
              <span className="text-xs font-bold text-green-600 dark:text-green-400">87%</span>
            </div>
            <div className="px-3 py-1.5 rounded-full flex items-center gap-1.5 bg-gray-100 dark:bg-zinc-800 border border-gray-200/50 dark:border-zinc-700/50 shadow-sm">
              <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-400" />
              <span className="text-xs text-gray-500 dark:text-zinc-400 font-medium">Avg loop time: </span>
              <span className="text-xs font-bold text-gray-900 dark:text-white">38s</span>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Flow Canvas */}
          <div className="flex-1 relative overflow-hidden bg-slate-50 dark:bg-[#010308] transition-colors duration-300">

            {/* Pipeline Flow */}
            <div className="absolute inset-0 flex items-center justify-center p-12">
              <div className="relative w-full max-w-6xl">

                {/* Connection lines and flow */}
                <div
                  className="absolute inset-0 w-full pointer-events-none z-0"
                  style={{ top: '50%', transform: 'translateY(-50%)' }}
                >
                  {nodes.slice(0, -1).map((node, index) => {
                    const spacing = 100 / nodes.length;
                    const leftPos = spacing * index + (spacing / 2) + 24; // Offset to start from right edge of node roughly
                    const isDone = node.state === 'success';
                    const isNextRunning = nodes[index + 1].state === 'running';
                    const isFailed = node.state === 'failed';

                    return (
                      <div
                        key={`connector-${index}`}
                        className="absolute h-[2px] transition-all duration-300"
                        style={{
                          left: `${leftPos}%`,
                          width: `calc(${spacing}% - 48px)`, // Subtract approximate node width to avoid overlapping
                          top: '50%',
                          transform: 'translateY(-50%)',
                          backgroundColor: isDone ? (isNextRunning ? 'transparent' : '#22c55e') : (isFailed ? '#f43f5e' : '#d1d5db')
                        }}
                      >
                        {isDone && isNextRunning && (
                          <div className="w-full h-full border-t-2 border-dashed border-blue-400 dark:border-blue-500" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Pipeline Nodes */}
                <div className="relative z-10 flex items-center justify-between">
                  {nodes.map((node, index) => (
                    <motion.div
                      key={node.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                      className="relative flex flex-col items-center group cursor-pointer"
                      style={{ width: `${100 / nodes.length}%` }}
                      onClick={() => setSelectedNode(node.id)}
                    >

                      <div
                        className={`
                        relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center 
                        transition-all duration-300 border border-gray-200 dark:border-zinc-800 shadow-sm
                        group-hover:scale-105 group-hover:shadow-md bg-white dark:bg-zinc-900
                        ${selectedNode === node.id ? 'ring-1 ring-gray-300 dark:ring-zinc-700 bg-gray-50 dark:bg-zinc-800/50' : ''}
                      `}
                      >
                        <node.icon
                          className={`w-6 h-6 sm:w-7 sm:h-7 ${getIconColor(node.state)}`}
                          strokeWidth={2}
                        />

                        {/* State indicator overlay icon */}
                        {node.state === 'success' && (
                          <CheckCircle className="absolute -top-1.5 -right-1.5 w-4 h-4 text-green-500 bg-white dark:bg-zinc-900 rounded-full" />
                        )}
                        {node.state === 'failed' && (
                          <AlertCircle className="absolute -top-1.5 -right-1.5 w-4 h-4 text-red-500 bg-white dark:bg-zinc-900 rounded-full" />
                        )}
                        {node.state === 'running' && (
                          <div className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500 border-2 border-white dark:border-zinc-900"></span>
                          </div>
                        )}
                      </div>

                      {/* Label below node */}
                      <div className="mt-4 text-center max-w-[120px]">
                        <div className={`
                        text-xs font-medium px-2 py-1 rounded-md transition-colors 
                        ${selectedNode === node.id ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-600 dark:text-zinc-400'}
                      `}>
                          {node.label}
                        </div>
                        {node.duration && (
                          <div className="text-[10px] mt-0.5 text-gray-400 dark:text-zinc-500 font-medium">
                            {node.duration}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Execution Inspector */}
          <AnimatePresence>
            {selectedNode && selectedNodeData && (
              <motion.div
                initial={{ x: 380, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 380, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="w-[380px] border-l border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-y-auto shadow-xl z-20 transition-colors duration-300"
              >
                <div className="p-6">

                  {/* Inspector Header */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        {selectedNodeData.label}
                      </h2>
                      <button
                        onClick={() => setSelectedNode(null)}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors text-gray-400 dark:text-zinc-500"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className={`
                    inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
                    ${nodeStateBadges[selectedNodeData.state] || 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400'}
                  `}>
                      <div className="w-1.5 h-1.5 rounded-full bg-current" />
                      {selectedNodeData.state.charAt(0).toUpperCase() + selectedNodeData.state.slice(1)}
                    </div>
                  </div>

                  {/* Run Details */}
                  <div className="mb-6 pb-6 border-b border-gray-100 dark:border-zinc-800/80">
                    <h3 className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-zinc-500 mb-4">Run Details</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-zinc-400 font-medium">Trigger</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">Commit push</span>
                      </div>
                      {selectedNodeData.duration && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500 dark:text-zinc-400 font-medium">Duration</span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">{selectedNodeData.duration}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-zinc-400 font-medium">Attempts</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">1 of 3</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-zinc-400 font-medium">Last run</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">2 min ago</span>
                      </div>
                    </div>
                  </div>

                  {/* AI Reasoning (for Claude step) */}
                  {selectedNode === 'claude' && (
                    <div className="mb-6 pb-6 border-b border-gray-100 dark:border-zinc-800/80">
                      <div className="flex items-center gap-2 mb-4">
                        <FileSearch className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Claude Analysis</h3>
                      </div>

                      {/* Rebuilt structured UI for analysis */}
                      <div className="mb-4">
                        <span className="inline-block px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 mb-3 shadow-sm border border-purple-200/50 dark:border-purple-500/20">
                          Root Cause Identified
                        </span>

                        <div className="rounded-xl p-4 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 shadow-sm relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full bg-red-500 dark:bg-red-600"></div>
                          <div className="flex gap-3">
                            <AlertCircle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                            <div>
                              <div className="text-sm font-semibold text-red-800 dark:text-red-300">
                                Null reference exception in authentication middleware
                              </div>
                              <div className="mt-2 text-xs text-red-700/80 dark:text-red-400/80 font-medium leading-relaxed">
                                Pattern detected: Token validation occurring before explicit null check on the global user object.
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 dark:bg-blue-900/10 rounded-full blur-3xl group-hover:bg-blue-100 dark:group-hover:bg-blue-900/20 transition-colors"></div>
                        <div className="relative">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            <Wrench className="w-4 h-4 text-blue-500" />
                            Recommendation
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-zinc-400 mb-4 font-medium leading-relaxed">
                            Add explicit null guard before accessing <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-blue-600 dark:text-blue-400 font-mono text-xs">user.id</code> property at line 127 in auth.ts.
                          </p>
                          <button className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-gray-900 rounded-lg text-sm font-bold transition-all shadow-sm flex justify-center items-center gap-2">
                            Apply Auto-Fix
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Auto Fix Preview (for fix step) */}
                  {selectedNode === 'fix' && (
                    <div className="mb-6 pb-6 border-b border-gray-100 dark:border-zinc-800/80">
                      <div className="flex items-center gap-2 mb-4">
                        <Code className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Auto Fix Preview</h3>
                      </div>
                      <div className="rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-zinc-800 text-xs font-mono bg-white dark:bg-[#0d1117]">
                        <div className="px-4 py-2 bg-gray-50 dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 font-sans font-medium flex justify-between">
                          auth.ts
                          <span className="text-[10px]">1 line changed</span>
                        </div>
                        <div className="p-4 overflow-x-auto">
                          <div className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 -mx-4 px-4 py-0.5 whitespace-pre">
                            <span className="opacity-50 select-none mr-2">-</span>
                            if (user.id === token.id) &#123;
                          </div>
                          <div className="text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/20 -mx-4 px-4 py-0.5 whitespace-pre">
                            <span className="opacity-50 select-none mr-2">+</span>
                            if (user && user.id === token.id) &#123;
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Test Execution Details */}
                  {selectedNode === 'test' && (
                    <div className="mb-6 pb-6 border-b border-gray-100 dark:border-zinc-800/80">
                      <h3 className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-zinc-500 mb-4">Test Results</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 rounded-lg border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 shadow-sm">
                          <span className="text-sm font-medium text-red-900 dark:text-red-300 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500" /> auth.test.ts
                          </span>
                          <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 font-semibold">
                            Failed
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg border border-green-200 dark:border-green-900/30 bg-green-50 dark:bg-green-950/20 shadow-sm">
                          <span className="text-sm font-medium text-green-900 dark:text-green-300 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" /> user.test.ts
                          </span>
                          <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 font-semibold">
                            Passed
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  <div className="mb-8">
                    <h3 className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-zinc-500 mb-3">Context</h3>
                    <p className="text-sm leading-relaxed text-gray-600 dark:text-zinc-400 font-medium bg-gray-50 dark:bg-zinc-800/50 p-3.5 rounded-xl border border-gray-100 dark:border-zinc-800/80">
                      {selectedNodeData.description}
                    </p>
                  </div>

                  {/* Bottom Action */}
                  <button
                    onClick={() => navigate(`/repo/${id}/workspace`)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-900 dark:text-white border border-gray-200 dark:border-zinc-700 shadow-sm"
                  >
                    <Play className="w-4 h-4" />
                    Open in Workspace
                  </button>

                  {/* Inline Quick Controls */}
                  <div className="mt-8 pt-6 border-t border-gray-100 dark:border-zinc-800/80">
                    <h3 className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-zinc-500 mb-4">Pipeline Actions</h3>
                    <div className="flex items-center gap-3">
                      {[
                        { icon: Target, label: 'Focus active run' },
                        { icon: RotateCcw, label: 'Replay last run' },
                        { icon: Download, label: 'Export logs' },
                        { icon: Grid3x3, label: 'Toggle auto-layout' }
                      ].map((action, index) => (
                        <button
                          key={index}
                          className="p-2.5 rounded-lg flex items-center justify-center transition-all bg-gray-50 dark:bg-zinc-800/50 border border-transparent hover:border-gray-200 dark:hover:border-zinc-700 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:shadow-sm"
                          title={action.label}
                        >
                          <action.icon className="w-4 h-4" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Run Timeline */}
        <div className="border-t border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-8 py-5 z-10 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.02)] transition-colors duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold tracking-wide uppercase text-gray-500 dark:text-zinc-500">
              Recent Pipeline Runs
            </span>
            <span className="text-xs font-medium text-gray-500 dark:text-zinc-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Last 2 hours
            </span>
          </div>

          <div className="flex items-center gap-2">
            {recentRuns.map((run, index) => (
              <div
                key={index}
                className="relative group cursor-pointer"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`w-8 h-2 rounded-full transition-all ${run.status === 'success'
                    ? 'bg-emerald-500 hover:bg-emerald-400' :
                    run.status === 'failed'
                      ? 'bg-rose-500 hover:bg-rose-400' :
                      'bg-blue-500 hover:bg-blue-400'
                    }`}
                />

                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-lg transform -translate-y-1 group-hover:-translate-y-2 z-50">
                  <span className="capitalize">{run.status}</span> • {run.time}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-white"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const nodeStateBadges: Record<NodeState, string> = {
  idle: 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400',
  running: 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  success: 'bg-green-50 text-green-700 dark:bg-green-500/20 dark:text-green-400',
  failed: 'bg-red-50 text-red-700 dark:bg-red-500/20 dark:text-red-400'
};
