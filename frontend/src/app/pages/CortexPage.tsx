"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Search, Shield, TestTube2, Eye, RefreshCw, Maximize2, Camera, Target, RotateCcw, Grid3x3, AlertCircle, CheckCircle, TrendingUp, ChevronRight } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';

const services = [
  { id: 1, name: 'auth-service', status: 'healthy', x: 25, y: 30, connections: [2, 3], tests: 100, errors: 0, deployment: '2h ago' },
  { id: 2, name: 'api-gateway', status: 'healthy', x: 45, y: 25, connections: [4, 5, 6], tests: 98, errors: 0, deployment: '3h ago' },
  { id: 3, name: 'user-db', status: 'healthy', x: 25, y: 55, connections: [], tests: 100, errors: 0, deployment: '1d ago' },
  { id: 4, name: 'payment-service', status: 'warning', x: 65, y: 20, connections: [7], tests: 94, errors: 2, deployment: '30m ago' },
  { id: 5, name: 'notification-service', status: 'healthy', x: 65, y: 40, connections: [8], tests: 100, errors: 0, deployment: '5h ago' },
  { id: 6, name: 'analytics-service', status: 'critical', x: 65, y: 60, connections: [9], tests: 85, errors: 12, deployment: '15m ago' },
  { id: 7, name: 'stripe-api', status: 'healthy', x: 85, y: 20, connections: [], tests: 100, errors: 0, deployment: '1d ago' },
  { id: 8, name: 'email-queue', status: 'healthy', x: 85, y: 40, connections: [], tests: 100, errors: 0, deployment: '6h ago' },
  { id: 9, name: 'postgres-db', status: 'healthy', x: 85, y: 60, connections: [], tests: 100, errors: 0, deployment: '2d ago' }
];

export function CortexPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [view, setView] = useState<'graph' | 'service' | 'flow'>('graph');
  const [filters, setFilters] = useState({
    sentinel: true,
    fortress: true,
    cortex: true
  });
  const [layers, setLayers] = useState({
    microservices: true,
    apis: true,
    databases: true,
    external: true,
    queues: true
  });
  
  const repoName = id === 'infrazero' ? 'InfraZero' : 
                   id === 'immersa' ? 'Immersa' : 
                   id === 'velocis-core' ? 'velocis-core' :
                   id === 'ai-observatory' ? 'ai-observatory' :
                   id === 'distributed-lab' ? 'distributed-lab' :
                   'test-sandbox';

  const selectedService = selectedNode ? services.find(s => s.id === selectedNode) : null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#22c55e';
      case 'warning': return '#f59e0b';
      case 'critical': return '#ef4444';
      default: return '#22c55e';
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: '#0b0b0c' }}
    >
      {/* Cortex Top Bar */}
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
            <span className="text-white font-medium">Visual Cortex</span>
          </div>
        </div>

        {/* Center - View Controls */}
        <div 
          className="flex items-center rounded-lg p-1"
          style={{ backgroundColor: '#0b0b0c' }}
        >
          {(['graph', 'service', 'flow'] as const).map((viewType) => (
            <button
              key={viewType}
              onClick={() => setView(viewType)}
              className="px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize"
              style={{
                backgroundColor: view === viewType ? '#1f2328' : 'transparent',
                color: view === viewType ? '#ffffff' : '#6b7280'
              }}
            >
              {viewType === 'graph' ? 'Graph View' : viewType === 'service' ? 'Service Map' : 'Dependency Flow'}
            </button>
          ))}
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-3">
          <button 
            className="p-2 rounded-lg hover:bg-[#1f2328] transition-colors"
            title="Refresh graph"
          >
            <RefreshCw className="w-4 h-4" style={{ color: '#6b7280' }} />
          </button>
          <button 
            className="p-2 rounded-lg hover:bg-[#1f2328] transition-colors"
            title="Fit to screen"
          >
            <Target className="w-4 h-4" style={{ color: '#6b7280' }} />
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

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Control Panel */}
        <AnimatePresence>
          {leftPanelOpen && (
            <motion.div
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="w-[280px] border-r p-6 overflow-y-auto"
              style={{ 
                backgroundColor: '#111214',
                borderColor: '#1f2328'
              }}
            >
              {/* Search */}
              <div className="mb-8">
                <div className="relative">
                  <Search 
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: '#6b7280' }}
                  />
                  <input
                    type="text"
                    placeholder="Search services…"
                    className="w-full pl-10 pr-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 transition-all"
                    style={{ 
                      borderColor: '#1f2328',
                      backgroundColor: '#0b0b0c',
                      color: '#ffffff'
                    }}
                  />
                </div>
              </div>

              {/* Agent Filters */}
              <div className="mb-8">
                <h3 className="text-xs font-semibold tracking-wider mb-3" style={{ color: '#6b7280' }}>
                  AGENT FILTERS
                </h3>
                <div className="space-y-2">
                  {[
                    { key: 'sentinel', label: 'Sentinel Signals', icon: Shield, color: 'var(--accent-purple)' },
                    { key: 'fortress', label: 'Fortress Failures', icon: TestTube2, color: 'var(--accent-blue)' },
                    { key: 'cortex', label: 'Visual Cortex Layers', icon: Eye, color: 'var(--accent-green)' }
                  ].map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => setFilters({ ...filters, [filter.key]: !filters[filter.key as keyof typeof filters] })}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
                      style={{
                        backgroundColor: filters[filter.key as keyof typeof filters] ? '#1f2328' : 'transparent',
                        border: filters[filter.key as keyof typeof filters] ? `1px solid ${filter.color}40` : '1px solid transparent'
                      }}
                    >
                      <filter.icon className="w-4 h-4" style={{ color: filter.color }} />
                      <span className="text-sm text-white">{filter.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Layer Controls */}
              <div className="mb-8">
                <h3 className="text-xs font-semibold tracking-wider mb-3" style={{ color: '#6b7280' }}>
                  LAYER CONTROLS
                </h3>
                <div className="space-y-2">
                  {[
                    { key: 'microservices', label: 'Microservices' },
                    { key: 'apis', label: 'APIs' },
                    { key: 'databases', label: 'Databases' },
                    { key: 'external', label: 'External Services' },
                    { key: 'queues', label: 'Queues' }
                  ].map((layer) => (
                    <label
                      key={layer.key}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={layers[layer.key as keyof typeof layers]}
                        onChange={() => setLayers({ ...layers, [layer.key]: !layers[layer.key as keyof typeof layers] })}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm text-white">{layer.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Complexity Slider */}
              <div>
                <h3 className="text-xs font-semibold tracking-wider mb-3" style={{ color: '#6b7280' }}>
                  GRAPH DENSITY
                </h3>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    defaultValue="70"
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs" style={{ color: '#6b7280' }}>
                    <span>Minimal</span>
                    <span>Full</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main 3D Canvas */}
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

          {/* WebGL Placeholder Label */}
          <div className="absolute top-8 left-8 z-10">
            <div 
              className="px-4 py-2 rounded-lg backdrop-blur-sm"
              style={{ 
                backgroundColor: 'rgba(17, 18, 20, 0.8)',
                border: '1px solid #1f2328'
              }}
            >
              <span className="text-sm font-medium" style={{ color: '#6b7280' }}>
                WebGL / Three.js Architecture View
              </span>
            </div>
          </div>

          {/* Service Nodes */}
          <div className="absolute inset-0 p-16">
            <svg width="100%" height="100%" className="absolute inset-0">
              {/* Draw connections first */}
              {services.map(service => 
                service.connections.map(targetId => {
                  const target = services.find(s => s.id === targetId);
                  if (!target) return null;
                  
                  return (
                    <motion.line
                      key={`${service.id}-${targetId}`}
                      x1={`${service.x}%`}
                      y1={`${service.y}%`}
                      x2={`${target.x}%`}
                      y2={`${target.y}%`}
                      stroke="url(#lineGradient)"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 0.3 }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                  );
                })
              )}
              
              {/* Gradient definitions */}
              <defs>
                <linearGradient id="lineGradient">
                  <stop offset="0%" stopColor="#6b7280" stopOpacity="0.1" />
                  <stop offset="50%" stopColor="#6b7280" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#6b7280" stopOpacity="0.1" />
                </linearGradient>
              </defs>
            </svg>

            {/* Service nodes */}
            {services.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="absolute cursor-pointer group"
                style={{
                  left: `${service.x}%`,
                  top: `${service.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
                onClick={() => setSelectedNode(service.id)}
              >
                {/* Node glow effect */}
                <motion.div
                  animate={{
                    scale: service.status === 'critical' ? [1, 1.18, 1] : [1, 1.05, 1],
                    opacity: service.status === 'critical' ? [0.5, 1, 0.5] : [0.3, 0.6, 0.3]
                  }}
                  transition={{
                    duration: service.status === 'critical' ? 1.4 : 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 rounded-full blur-xl"
                  style={{
                    backgroundColor: getStatusColor(service.status),
                    width: '80px',
                    height: '80px',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)'
                  }}
                />

                {/* Main node */}
                <motion.div
                  animate={{
                    y: [-2, 2, -2]
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="relative w-16 h-16 rounded-xl flex items-center justify-center backdrop-blur-sm transition-all group-hover:scale-110"
                  style={{
                    backgroundColor: 'rgba(17, 18, 20, 0.9)',
                    border: `2px solid ${getStatusColor(service.status)}`,
                    boxShadow: `0 0 20px ${getStatusColor(service.status)}40`
                  }}
                >
                  {service.status === 'critical' && (
                    <AlertCircle className="w-6 h-6" style={{ color: getStatusColor(service.status) }} />
                  )}
                  {service.status === 'warning' && (
                    <TrendingUp className="w-6 h-6" style={{ color: getStatusColor(service.status) }} />
                  )}
                  {service.status === 'healthy' && (
                    <CheckCircle className="w-6 h-6" style={{ color: getStatusColor(service.status) }} />
                  )}
                </motion.div>

                {/* Label */}
                <div 
                  className="absolute top-full mt-3 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1 rounded-md text-xs font-medium"
                  style={{
                    backgroundColor: 'rgba(17, 18, 20, 0.95)',
                    border: '1px solid #1f2328',
                    color: '#ffffff'
                  }}
                >
                  {service.name}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Toggle left panel button */}
          <button
            onClick={() => setLeftPanelOpen(!leftPanelOpen)}
            className="absolute top-4 left-4 p-2 rounded-lg backdrop-blur-sm transition-all hover:scale-110 z-20"
            style={{
              backgroundColor: 'rgba(17, 18, 20, 0.8)',
              border: '1px solid #1f2328'
            }}
          >
            <motion.div
              animate={{ rotate: leftPanelOpen ? 0 : 180 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </motion.div>
          </button>
        </div>

        {/* Right Inspector Panel */}
        <AnimatePresence>
          {selectedNode && selectedService && (
            <motion.div
              initial={{ x: 340, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 340, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="w-[340px] border-l p-6 overflow-y-auto"
              style={{ 
                backgroundColor: '#111214',
                borderColor: '#1f2328'
              }}
            >
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-semibold text-white">
                    {selectedService.name}
                  </h2>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="p-1 hover:bg-[#1f2328] rounded transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" style={{ color: '#6b7280' }} />
                  </button>
                </div>
                <div 
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: getStatusColor(selectedService.status) + '20',
                    color: getStatusColor(selectedService.status)
                  }}
                >
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getStatusColor(selectedService.status) }}
                  />
                  {selectedService.status.charAt(0).toUpperCase() + selectedService.status.slice(1)}
                </div>
              </div>

              {/* Health Section */}
              <div className="mb-6 pb-6 border-b" style={{ borderColor: '#1f2328' }}>
                <h3 className="text-sm font-semibold mb-4 text-white">Health</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: '#6b7280' }}>Test Status</span>
                    <span className="text-sm font-medium text-white">{selectedService.tests}% passing</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: '#6b7280' }}>Error Rate</span>
                    <span className="text-sm font-medium text-white">{selectedService.errors} errors/min</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: '#6b7280' }}>Last Deployment</span>
                    <span className="text-sm font-medium text-white">{selectedService.deployment}</span>
                  </div>
                </div>
              </div>

              {/* Sentinel Insights */}
              <div className="mb-6 pb-6 border-b" style={{ borderColor: '#1f2328' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-4 h-4" style={{ color: 'var(--accent-purple)' }} />
                  <h3 className="text-sm font-semibold text-white">Sentinel Insights</h3>
                </div>
                <div className="space-y-3">
                  {selectedService.status === 'critical' && (
                    <div className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: '#ef4444' }} />
                      <p className="text-sm" style={{ color: '#6b7280' }}>
                        Critical memory leak detected in request handler
                      </p>
                    </div>
                  )}
                  {selectedService.status === 'warning' && (
                    <div className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: '#f59e0b' }} />
                      <p className="text-sm" style={{ color: '#6b7280' }}>
                        Potential race condition detected
                      </p>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: '#6b7280' }} />
                    <p className="text-sm" style={{ color: '#6b7280' }}>
                      Memory usage spike observed during peak hours
                    </p>
                  </div>
                </div>
              </div>

              {/* Fortress Status */}
              <div className="mb-6 pb-6 border-b" style={{ borderColor: '#1f2328' }}>
                <div className="flex items-center gap-2 mb-4">
                  <TestTube2 className="w-4 h-4" style={{ color: 'var(--accent-blue)' }} />
                  <h3 className="text-sm font-semibold text-white">Fortress Status</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: '#6b7280' }}>Tests passing</span>
                    <span className="text-sm font-medium text-white">{selectedService.tests}%</span>
                  </div>
                  {selectedService.status !== 'healthy' && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: '#6b7280' }}>Last failure</span>
                      <span className="text-sm font-medium text-white">12 min ago</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Dependencies */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-4 text-white">Dependencies</h3>
                <div className="space-y-2">
                  {selectedService.connections.map(connId => {
                    const conn = services.find(s => s.id === connId);
                    if (!conn) return null;
                    return (
                      <button
                        key={connId}
                        onClick={() => setSelectedNode(connId)}
                        className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-[#1f2328] transition-colors"
                        style={{ backgroundColor: '#0b0b0c' }}
                      >
                        <span className="text-sm text-white">{conn.name}</span>
                        <ChevronRight className="w-4 h-4" style={{ color: '#6b7280' }} />
                      </button>
                    );
                  })}
                  {selectedService.connections.length === 0 && (
                    <p className="text-sm" style={{ color: '#6b7280' }}>No dependencies</p>
                  )}
                </div>
              </div>

              {/* Bottom Action */}
              <button 
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all hover:opacity-80"
                style={{
                  backgroundColor: '#ffffff',
                  color: '#000000'
                }}
              >
                Open in Workspace
                <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Mini Timeline */}
      <div 
        className="border-t backdrop-blur-lg h-[80px] flex items-center px-8"
        style={{ 
          backgroundColor: 'rgba(17, 18, 20, 0.95)',
          borderColor: '#1f2328'
        }}
      >
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold tracking-wide" style={{ color: '#6b7280' }}>
              SYSTEM ACTIVITY TIMELINE
            </span>
            <span className="text-xs" style={{ color: '#6b7280' }}>Last 24 hours</span>
          </div>
          <div className="relative h-6 rounded-full overflow-hidden" style={{ backgroundColor: '#0b0b0c' }}>
            {/* Activity ticks */}
            {[12, 28, 45, 62, 78, 85, 92].map((position, i) => (
              <div
                key={i}
                className="absolute top-1/2 -translate-y-1/2 w-1 h-3 rounded-full"
                style={{
                  left: `${position}%`,
                  backgroundColor: i % 3 === 0 ? '#22c55e' : i % 3 === 1 ? '#f59e0b' : 'var(--accent-purple)'
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Floating Quick Actions */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-3 z-50">
        {[
          { icon: AlertCircle, label: 'Focus failing nodes', color: '#ef4444' },
          { icon: RotateCcw, label: 'Reset view', color: '#6b7280' },
          { icon: Grid3x3, label: 'Auto-layout', color: '#6b7280' },
          { icon: Camera, label: 'Screenshot graph', color: '#6b7280' }
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
