"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, TestTube2, RefreshCw, Pause, Maximize2, Target, RotateCcw, Download, Grid3x3, CheckCircle, AlertCircle, Play, Code, Cpu, FileSearch, Wrench, X } from 'lucide-react';
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
  
  const repoName = id === 'infrazero' ? 'InfraZero' : 
                   id === 'immersa' ? 'Immersa' : 
                   id === 'velocis-core' ? 'velocis-core' :
                   id === 'ai-observatory' ? 'ai-observatory' :
                   id === 'distributed-lab' ? 'distributed-lab' :
                   'test-sandbox';

  const selectedNodeData = nodes.find(n => n.id === selectedNode);

  const getStateColor = (state: NodeState) => {
    switch (state) {
      case 'success': return '#22c55e';
      case 'running': return '#3b82f6';
      case 'failed': return '#ef4444';
      default: return '#6b7280';
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
    <div 
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: '#0b0b0c' }}
    >
      {/* Pipeline Top Bar */}
      <div 
        className="border-b flex items-center justify-between px-6 h-[60px]"
        style={{ 
          backgroundColor: '#111214',
          borderColor: '#1f2328'
        }}
      >
        {/* Left - Breadcrumb */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div 
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#ffffff' }}
            >
              <span className="text-black font-bold text-sm">V</span>
            </div>
            <span className="font-bold text-white">Velocis</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm" style={{ color: '#6b7280' }}>
            <button 
              onClick={() => navigate('/dashboard')}
              className="hover:text-white transition-colors"
            >
              Dashboard
            </button>
            <span>/</span>
            <button 
              onClick={() => navigate(`/repo/${id}`)}
              className="hover:text-white transition-colors"
            >
              {repoName}
            </button>
            <span>/</span>
            <span className="text-white font-medium">QA Pipeline</span>
          </div>
        </div>

        {/* Center - Mode Selector */}
        <div 
          className="flex items-center rounded-lg p-1"
          style={{ backgroundColor: '#0b0b0c' }}
        >
          {(['live', 'recent', 'historical'] as const).map((modeType) => (
            <button
              key={modeType}
              onClick={() => setMode(modeType)}
              className="px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize"
              style={{
                backgroundColor: mode === modeType ? '#1f2328' : 'transparent',
                color: mode === modeType ? '#ffffff' : '#6b7280'
              }}
            >
              {modeType === 'live' ? 'Live Run' : modeType === 'recent' ? 'Recent Runs' : 'Historical'}
            </button>
          ))}
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`p-2 rounded-lg transition-colors ${autoRefresh ? 'bg-blue-500/20' : 'hover:bg-[#1f2328]'}`}
            title="Auto-refresh"
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'text-blue-400' : 'text-gray-400'}`} />
          </button>
          <button 
            className="p-2 rounded-lg hover:bg-[#1f2328] transition-colors"
            title="Pause stream"
          >
            <Pause className="w-4 h-4" style={{ color: '#6b7280' }} />
          </button>
          <button 
            className="p-2 rounded-lg hover:bg-[#1f2328] transition-colors"
            title="Fullscreen"
          >
            <Maximize2 className="w-4 h-4" style={{ color: '#6b7280' }} />
          </button>
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center ml-2"
            style={{ backgroundColor: 'var(--accent-purple-soft)' }}
          >
            <span className="text-sm font-semibold" style={{ color: 'var(--accent-purple)' }}>
              R
            </span>
          </div>
        </div>
      </div>

      {/* Pipeline Status Strip */}
      <div 
        className="px-6 py-3 flex items-center justify-between border-b"
        style={{ 
          backgroundColor: '#13141a',
          borderColor: '#1f2328'
        }}
      >
        <div>
          <div className="font-semibold text-white text-sm mb-0.5">
            Fortress Autonomous QA Active
          </div>
          <div className="text-xs" style={{ color: '#6b7280' }}>
            Monitoring commits and executing self-healing loops
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div 
            className="px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: '#1f2328' }}
          >
            <span className="text-xs" style={{ color: '#6b7280' }}>Runs today: </span>
            <span className="text-xs font-semibold text-white">42</span>
          </div>
          <div 
            className="px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: '#1f2328' }}
          >
            <span className="text-xs" style={{ color: '#6b7280' }}>Auto-fix success: </span>
            <span className="text-xs font-semibold" style={{ color: '#22c55e' }}>87%</span>
          </div>
          <div 
            className="px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: '#1f2328' }}
          >
            <span className="text-xs" style={{ color: '#6b7280' }}>Avg loop time: </span>
            <span className="text-xs font-semibold text-white">38s</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Flow Canvas */}
        <div className="flex-1 relative overflow-hidden">
          {/* Canvas background with grid */}
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(rgba(18, 19, 22, 0.5) 1px, transparent 1px),
                linear-gradient(90deg, rgba(18, 19, 22, 0.5) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
              backgroundColor: '#0b0b0c'
            }}
          >
            {/* Subtle vignette */}
            <div 
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.4) 100%)'
              }}
            />
          </div>

          {/* Pipeline Flow */}
          <div className="absolute inset-0 flex items-center justify-center p-12">
            <div className="relative" style={{ width: '100%', maxWidth: '1200px' }}>
              {/* Connection lines and flow */}
              <svg 
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ top: '50%', transform: 'translateY(-50%)' }}
              >
                {nodes.slice(0, -1).map((node, index) => {
                  const spacing = 100 / (nodes.length - 1);
                  const x1 = spacing * index + 8;
                  const x2 = spacing * (index + 1) - 8;
                  const isActive = node.state === 'success' || node.state === 'running';
                  
                  return (
                    <g key={`line-${index}`}>
                      <line
                        x1={`${x1}%`}
                        y1="50%"
                        x2={`${x2}%`}
                        y2="50%"
                        stroke={isActive ? getStateColor(node.state) : '#1f2328'}
                        strokeWidth="2"
                        opacity={isActive ? 0.6 : 0.3}
                      />
                      
                      {/* Animated flow particles */}
                      {isActive && (
                        <>
                          <motion.circle
                            cx={`${x1}%`}
                            cy="50%"
                            r="3"
                            fill={getStateColor(node.state)}
                            animate={{
                              cx: [`${x1}%`, `${x2}%`],
                              opacity: [0, 1, 0]
                            }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              ease: "linear"
                            }}
                          />
                        </>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Pipeline Nodes */}
              <div className="relative flex items-center justify-between">
                {nodes.map((node, index) => (
                  <motion.div
                    key={node.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="relative flex flex-col items-center"
                    style={{ width: `${100 / nodes.length}%` }}
                  >
                    {/* Node */}
                    <motion.div
                      animate={{
                        scale: node.state === 'failed' ? [1, 1.12, 1] : node.state === 'running' ? [1, 1.05, 1] : 1,
                        opacity: node.state === 'idle' ? 0.5 : 1
                      }}
                      transition={{
                        duration: node.state === 'failed' ? 1.1 : node.state === 'running' ? 1.2 : 2,
                        repeat: node.state !== 'idle' ? Infinity : 0,
                        ease: "easeInOut"
                      }}
                      onClick={() => setSelectedNode(node.id)}
                      className="relative cursor-pointer group"
                    >
                      {/* Outer glow for active states */}
                      {(node.state === 'running' || node.state === 'failed') && (
                        <motion.div
                          animate={{
                            opacity: [0.3, 0.7, 0.3],
                            scale: [1, 1.2, 1]
                          }}
                          transition={{
                            duration: node.state === 'failed' ? 1.1 : 1.2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                          className="absolute inset-0 rounded-2xl blur-xl"
                          style={{
                            backgroundColor: getStateColor(node.state),
                            width: '120px',
                            height: '120px',
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)'
                          }}
                        />
                      )}

                      {/* Main node card */}
                      <div
                        className="relative w-28 h-28 rounded-2xl flex flex-col items-center justify-center backdrop-blur-sm transition-all group-hover:scale-105"
                        style={{
                          backgroundColor: 'rgba(17, 18, 20, 0.95)',
                          border: `2px solid ${getStateColor(node.state)}`,
                          boxShadow: `0 0 30px ${getStateColor(node.state)}40`
                        }}
                      >
                        {/* Running state border animation */}
                        {node.state === 'running' && (
                          <motion.div
                            className="absolute inset-0 rounded-2xl"
                            style={{
                              background: `conic-gradient(from 0deg, transparent, ${getStateColor(node.state)})`,
                              mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                              maskComposite: 'exclude',
                              padding: '2px'
                            }}
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          />
                        )}

                        <node.icon 
                          className="w-8 h-8 mb-2" 
                          style={{ color: getStateColor(node.state) }}
                          strokeWidth={2}
                        />
                        
                        {/* State indicator */}
                        {node.state === 'success' && (
                          <CheckCircle className="absolute top-2 right-2 w-4 h-4" style={{ color: '#22c55e' }} />
                        )}
                        {node.state === 'failed' && (
                          <AlertCircle className="absolute top-2 right-2 w-4 h-4" style={{ color: '#ef4444' }} />
                        )}
                        {node.state === 'running' && (
                          <motion.div
                            animate={{ opacity: [0.6, 1, 0.6] }}
                            transition={{ duration: 1.2, repeat: Infinity }}
                            className="absolute top-2 right-2 w-2 h-2 rounded-full"
                            style={{ backgroundColor: '#3b82f6' }}
                          />
                        )}
                      </div>
                    </motion.div>

                    {/* Label below node */}
                    <div className="mt-4 text-center">
                      <div 
                        className="text-xs font-medium px-3 py-1 rounded-md whitespace-nowrap"
                        style={{
                          color: '#ffffff',
                          backgroundColor: 'rgba(17, 18, 20, 0.8)',
                          border: '1px solid #1f2328'
                        }}
                      >
                        {node.label}
                      </div>
                      {node.duration && (
                        <div className="text-[10px] mt-1" style={{ color: '#6b7280' }}>
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
              initial={{ x: 360, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 360, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="w-[360px] border-l overflow-y-auto"
              style={{ 
                backgroundColor: '#111214',
                borderColor: '#1f2328'
              }}
            >
              <div className="p-6">
                {/* Header */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xl font-semibold text-white">
                      {selectedNodeData.label}
                    </h2>
                    <button
                      onClick={() => setSelectedNode(null)}
                      className="p-1 hover:bg-[#1f2328] rounded transition-colors"
                    >
                      <X className="w-5 h-5" style={{ color: '#6b7280' }} />
                    </button>
                  </div>
                  <div 
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: getStateColor(selectedNodeData.state) + '20',
                      color: getStateColor(selectedNodeData.state)
                    }}
                  >
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getStateColor(selectedNodeData.state) }}
                    />
                    {selectedNodeData.state.charAt(0).toUpperCase() + selectedNodeData.state.slice(1)}
                  </div>
                </div>

                {/* Run Details */}
                <div className="mb-6 pb-6 border-b" style={{ borderColor: '#1f2328' }}>
                  <h3 className="text-sm font-semibold mb-4 text-white">Run Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: '#6b7280' }}>Trigger</span>
                      <span className="text-sm font-medium text-white">Commit push</span>
                    </div>
                    {selectedNodeData.duration && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm" style={{ color: '#6b7280' }}>Duration</span>
                        <span className="text-sm font-medium text-white">{selectedNodeData.duration}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: '#6b7280' }}>Attempts</span>
                      <span className="text-sm font-medium text-white">1 of 3</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: '#6b7280' }}>Last run</span>
                      <span className="text-sm font-medium text-white">2 min ago</span>
                    </div>
                  </div>
                </div>

                {/* AI Reasoning (for Claude step) */}
                {selectedNode === 'claude' && (
                  <div className="mb-6 pb-6 border-b" style={{ borderColor: '#1f2328' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <FileSearch className="w-4 h-4" style={{ color: 'var(--accent-blue)' }} />
                      <h3 className="text-sm font-semibold text-white">Claude Analysis</h3>
                    </div>
                    <div 
                      className="rounded-lg p-4 text-sm leading-relaxed"
                      style={{ 
                        backgroundColor: '#0b0b0c',
                        border: '1px solid #1f2328',
                        color: '#d1d5db'
                      }}
                    >
                      <p className="mb-3">
                        **Root Cause:** Null reference exception in authentication middleware
                      </p>
                      <p className="mb-3">
                        **Pattern:** Token validation occurring before null check on user object
                      </p>
                      <p>
                        **Recommendation:** Add explicit null guard before accessing user.id property at line 127
                      </p>
                    </div>
                  </div>
                )}

                {/* Auto Fix Preview (for fix step) */}
                {selectedNode === 'fix' && (
                  <div className="mb-6 pb-6 border-b" style={{ borderColor: '#1f2328' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <Wrench className="w-4 h-4" style={{ color: 'var(--accent-green)' }} />
                      <h3 className="text-sm font-semibold text-white">Auto Fix Preview</h3>
                    </div>
                    <div 
                      className="rounded-lg p-4 text-xs font-mono"
                      style={{ 
                        backgroundColor: '#0b0b0c',
                        border: '1px solid #1f2328'
                      }}
                    >
                      <div className="mb-2" style={{ color: '#ef4444' }}>- if (user.id === token.id) &#123;</div>
                      <div style={{ color: '#22c55e' }}>+ if (user && user.id === token.id) &#123;</div>
                    </div>
                    <div className="mt-3 text-xs" style={{ color: '#6b7280' }}>
                      Proposed patch • 1 line changed
                    </div>
                  </div>
                )}

                {/* Test Execution Details */}
                {selectedNode === 'test' && (
                  <div className="mb-6 pb-6 border-b" style={{ borderColor: '#1f2328' }}>
                    <h3 className="text-sm font-semibold mb-4 text-white">Test Results</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#0b0b0c' }}>
                        <span className="text-sm text-white">auth.test.ts</span>
                        <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#ef444420', color: '#ef4444' }}>
                          Failed
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#0b0b0c' }}>
                        <span className="text-sm text-white">user.test.ts</span>
                        <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#22c55e20', color: '#22c55e' }}>
                          Passed
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Description */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold mb-3 text-white">Description</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#9ca3af' }}>
                    {selectedNodeData.description}
                  </p>
                </div>

                {/* Bottom Action */}
                <button 
                  onClick={() => navigate(`/repo/${id}/workspace`)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all hover:opacity-80"
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#000000'
                  }}
                >
                  Open in Workspace
                  <Play className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Run Timeline */}
      <div 
        className="border-t backdrop-blur-lg px-8 py-4"
        style={{ 
          backgroundColor: 'rgba(17, 18, 20, 0.95)',
          borderColor: '#1f2328'
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold tracking-wide" style={{ color: '#6b7280' }}>
            RECENT PIPELINE RUNS
          </span>
          <span className="text-xs" style={{ color: '#6b7280' }}>Last 2 hours</span>
        </div>
        
        <div className="flex items-center gap-2">
          {recentRuns.map((run, index) => (
            <div
              key={index}
              className="relative group cursor-pointer"
              style={{ flex: 1 }}
            >
              <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="h-10 rounded-md transition-all hover:opacity-80"
                style={{
                  backgroundColor: run.status === 'success' ? '#22c55e' :
                                 run.status === 'failed' ? '#ef4444' : '#3b82f6',
                  opacity: run.status === 'success' ? 0.6 : 0.8
                }}
              />
              
              {/* Tooltip */}
              <div 
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{
                  backgroundColor: 'rgba(17, 18, 20, 0.95)',
                  border: '1px solid #1f2328',
                  color: '#ffffff'
                }}
              >
                {run.status} • {run.time}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Quick Controls */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-3 z-50">
        {[
          { icon: Target, label: 'Focus active run', color: '#3b82f6' },
          { icon: RotateCcw, label: 'Replay last run', color: '#6b7280' },
          { icon: Download, label: 'Export logs', color: '#6b7280' },
          { icon: Grid3x3, label: 'Toggle auto-layout', color: '#6b7280' }
        ].map((action, index) => (
          <motion.button
            key={index}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.8 + index * 0.1 }}
            whileHover={{ scale: 1.1, boxShadow: `0 0 20px ${action.color}40` }}
            className="w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center transition-all"
            style={{
              backgroundColor: 'rgba(17, 18, 20, 0.9)',
              border: '1px solid #1f2328'
            }}
            title={action.label}
          >
            <action.icon className="w-5 h-5" style={{ color: action.color }} />
          </motion.button>
        ))}
      </div>
    </div>
  );
}
