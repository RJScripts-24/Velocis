"use client";

import { motion } from 'motion/react';
import { Bell, Search, CheckCircle, Shield, TestTube2, Eye, GitBranch, ChevronRight, Home, Activity, Settings, Webhook, Sliders, TrendingUp, AlertCircle, Cloud } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';

// Mock repository data - in a real app, this would come from an API
const repositoryData: Record<string, any> = {
  'infrazero': {
    name: 'InfraZero',
    status: 'healthy',
    statusColor: '#22c55e',
    statusLabel: 'System Healthy',
    visibility: 'Private',
    language: 'TypeScript',
    lastScanned: '3 min ago',
    size: '2.4M LOC',
    metrics: {
      riskScore: 'Low',
      testStability: '100%',
      architectureDrift: 'None detected',
      lastAction: '2 minutes ago'
    },
    sentinel: {
      activePRs: 2,
      lastUpdate: '5 minutes ago'
    },
    fortress: {
      status: 'All pipelines passing',
      lastRun: '10 minutes ago'
    },
    cortex: {
      lastUpdate: '2 minutes ago',
      services: 42
    },
    risks: {
      critical: 0,
      medium: 2,
      low: 5
    }
  },
  'immersa': {
    name: 'Immersa',
    status: 'healthy',
    statusColor: '#22c55e',
    statusLabel: 'System Healthy',
    visibility: 'Private',
    language: 'Python',
    lastScanned: '5 min ago',
    size: '1.8M LOC',
    metrics: {
      riskScore: 'Low',
      testStability: '98%',
      architectureDrift: 'None detected',
      lastAction: '8 minutes ago'
    },
    sentinel: {
      activePRs: 1,
      lastUpdate: '12 minutes ago'
    },
    fortress: {
      status: 'All pipelines passing',
      lastRun: '15 minutes ago'
    },
    cortex: {
      lastUpdate: '5 minutes ago',
      services: 28
    },
    risks: {
      critical: 0,
      medium: 1,
      low: 3
    }
  },
  'nexlayer': {
    name: 'Nexlayer',
    status: 'healthy',
    statusColor: '#22c55e',
    statusLabel: 'System Healthy',
    visibility: 'Private',
    language: 'Go',
    lastScanned: '4 min ago',
    size: '1.2M LOC',
    metrics: {
      riskScore: 'Low',
      testStability: '100%',
      architectureDrift: 'None detected',
      lastAction: '4 minutes ago'
    },
    sentinel: {
      activePRs: 0,
      lastUpdate: '8 minutes ago'
    },
    fortress: {
      status: 'All pipelines passing',
      lastRun: '12 minutes ago'
    },
    cortex: {
      lastUpdate: '4 minutes ago',
      services: 34
    },
    risks: {
      critical: 0,
      medium: 0,
      low: 2
    }
  },
  'databridge': {
    name: 'DataBridge',
    status: 'healthy',
    statusColor: '#22c55e',
    statusLabel: 'System Healthy',
    visibility: 'Private',
    language: 'TypeScript',
    lastScanned: '6 min ago',
    size: '890K LOC',
    metrics: {
      riskScore: 'Low',
      testStability: '97%',
      architectureDrift: 'Minor — 1 stale endpoint',
      lastAction: '6 minutes ago'
    },
    sentinel: {
      activePRs: 1,
      lastUpdate: '10 minutes ago'
    },
    fortress: {
      status: 'All pipelines passing',
      lastRun: '18 minutes ago'
    },
    cortex: {
      lastUpdate: '6 minutes ago',
      services: 21
    },
    risks: {
      critical: 0,
      medium: 1,
      low: 3
    }
  },
  'velocis-core': {
    name: 'velocis-core',
    status: 'warning',
    statusColor: '#eab308',
    statusLabel: 'Minor Risks',
    visibility: 'Private',
    language: 'TypeScript',
    lastScanned: '1 min ago',
    size: '3.2M LOC',
    metrics: {
      riskScore: 'Medium',
      testStability: '94%',
      architectureDrift: 'Minor changes detected',
      lastAction: '1 minute ago'
    },
    sentinel: {
      activePRs: 3,
      lastUpdate: '2 minutes ago'
    },
    fortress: {
      status: '2 flaky tests detected',
      lastRun: '3 minutes ago'
    },
    cortex: {
      lastUpdate: '1 minute ago',
      services: 58
    },
    risks: {
      critical: 0,
      medium: 4,
      low: 8
    }
  },
  'ai-observatory': {
    name: 'ai-observatory',
    status: 'healthy',
    statusColor: '#22c55e',
    statusLabel: 'System Healthy',
    visibility: 'Public',
    language: 'JavaScript',
    lastScanned: '10 min ago',
    size: '980K LOC',
    metrics: {
      riskScore: 'Low',
      testStability: '100%',
      architectureDrift: 'None detected',
      lastAction: '15 minutes ago'
    },
    sentinel: {
      activePRs: 0,
      lastUpdate: '20 minutes ago'
    },
    fortress: {
      status: 'All pipelines passing',
      lastRun: '25 minutes ago'
    },
    cortex: {
      lastUpdate: '10 minutes ago',
      services: 18
    },
    risks: {
      critical: 0,
      medium: 0,
      low: 2
    }
  },
  'distributed-lab': {
    name: 'distributed-lab',
    status: 'attention',
    statusColor: '#dc2626',
    statusLabel: 'Attention Required',
    visibility: 'Private',
    language: 'Go',
    lastScanned: '2 min ago',
    size: '1.5M LOC',
    metrics: {
      riskScore: 'High',
      testStability: '85%',
      architectureDrift: 'Significant drift',
      lastAction: '30 seconds ago'
    },
    sentinel: {
      activePRs: 5,
      lastUpdate: '1 minute ago'
    },
    fortress: {
      status: '5 failing tests',
      lastRun: '2 minutes ago'
    },
    cortex: {
      lastUpdate: '3 minutes ago',
      services: 35
    },
    risks: {
      critical: 2,
      medium: 6,
      low: 10
    }
  },
  'test-sandbox': {
    name: 'test-sandbox',
    status: 'healthy',
    statusColor: '#22c55e',
    statusLabel: 'System Healthy',
    visibility: 'Public',
    language: 'Python',
    lastScanned: '4 min ago',
    size: '450K LOC',
    metrics: {
      riskScore: 'Low',
      testStability: '100%',
      architectureDrift: 'None detected',
      lastAction: '5 minutes ago'
    },
    sentinel: {
      activePRs: 4,
      lastUpdate: '3 minutes ago'
    },
    fortress: {
      status: 'All pipelines passing',
      lastRun: '8 minutes ago'
    },
    cortex: {
      lastUpdate: '4 minutes ago',
      services: 12
    },
    risks: {
      critical: 0,
      medium: 1,
      low: 4
    }
  }
};

export function RepositoryPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const repo = repositoryData[id || 'infrazero'] || repositoryData['infrazero'];

  const activityItems = [
    {
      icon: Shield,
      color: 'var(--accent-purple)',
      text: `Sentinel reviewed PR #482 in ${repo.name}`,
      time: '5 minutes ago'
    },
    {
      icon: TestTube2,
      color: 'var(--accent-blue)',
      text: 'Fortress executed full test suite',
      time: '12 minutes ago'
    },
    {
      icon: Eye,
      color: 'var(--accent-green)',
      text: 'Visual Cortex refreshed service map',
      time: '18 minutes ago'
    },
    {
      icon: Shield,
      color: 'var(--accent-purple)',
      text: 'Sentinel flagged potential memory leak',
      time: '1 hour ago'
    },
    {
      icon: TestTube2,
      color: 'var(--accent-blue)',
      text: 'Fortress detected flaky test pattern',
      time: '2 hours ago'
    }
  ];

  const triAgentCards = [
    {
      title: 'Launch Visual Cortex',
      description: 'Explore the live architecture graph, service dependencies, and real-time topology insights for this repository.',
      accentColor: 'var(--accent-green)',
      accentBg: 'var(--accent-green-soft)',
      icon: Eye,
      previewLabel: 'Architecture Graph Preview',
      status: `Graph last updated ${repo.cortex.lastUpdate}`,
      cta: 'Open Graph',
      action: () => navigate(`/repo/${id}/cortex`)
    },
    {
      title: 'Enter Workspace',
      description: "Dive into Sentinel's intelligent PR reviews, risk detection, and autonomous code analysis workspace.",
      accentColor: 'var(--accent-purple)',
      accentBg: 'var(--accent-purple-soft)',
      icon: Shield,
      previewLabel: 'PR Intelligence Preview',
      status: `${repo.sentinel.activePRs} active PR reviews`,
      cta: 'Open Workspace',
      action: () => navigate(`/repo/${id}/workspace`)
    },
    {
      title: 'View QA Pipeline',
      description: 'Monitor Fortress continuous testing, failure detection, and automated QA loops across the codebase.',
      accentColor: 'var(--accent-blue)',
      accentBg: 'var(--accent-blue-soft)',
      icon: TestTube2,
      previewLabel: 'QA Pipeline Preview',
      status: repo.fortress.status,
      cta: 'View Pipeline',
      action: () => navigate(`/repo/${id}/pipeline`)
    },
    {
      title: 'IaC Prediction',
      description: 'Preview auto-generated infrastructure code, analyze AWS cost impact, and validate serverless efficiency before merge.',
      accentColor: '#f59e0b',
      accentBg: '#fef3c7',
      icon: Cloud,
      previewLabel: 'Infrastructure Cost Preview',
      status: 'Last generated 2 minutes ago',
      cta: 'View Infrastructure',
      action: () => navigate(`/repo/${id}/infrastructure`)
    }
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-soft)' }}>
      {/* App Navbar */}
      <nav 
        className="sticky top-0 z-50 border-b bg-white"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
          {/* Left - Breadcrumb */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--cta-primary)' }}
              >
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                Velocis
              </span>
            </div>
            
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <button 
                onClick={() => navigate('/dashboard')}
                className="hover:opacity-70 transition-opacity"
              >
                Dashboard
              </button>
              <span>/</span>
              <span style={{ color: 'var(--text-primary)' }} className="font-medium">
                {repo.name}
              </span>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-4">
            <button className="relative p-2 hover:bg-gray-50 rounded-lg transition-colors">
              <Bell className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            
            <div className="flex items-center gap-2.5">
              <div 
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--accent-purple-soft)' }}
              >
                <span className="text-sm font-semibold" style={{ color: 'var(--accent-purple)' }}>
                  R
                </span>
              </div>
              <div 
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                style={{ backgroundColor: 'var(--accent-green-soft)' }}
              >
                <CheckCircle className="w-3.5 h-3.5" style={{ color: 'var(--accent-green)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--accent-green)' }}>
                  GitHub
                </span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-[1280px] mx-auto px-6 py-12">
        {/* Repo Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 
                className="mb-3 tracking-tight"
                style={{ 
                  fontSize: '44px',
                  fontWeight: 600,
                  color: 'var(--text-primary)'
                }}
              >
                {repo.name}
              </h1>
              
              {/* Metadata row */}
              <div className="flex flex-wrap items-center gap-3 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
                <span 
                  className="px-2.5 py-1 rounded-md text-[12px] font-medium"
                  style={{ 
                    backgroundColor: repo.visibility === 'Private' ? 'rgba(0, 0, 0, 0.06)' : 'var(--accent-blue-soft)',
                    color: repo.visibility === 'Private' ? 'var(--text-primary)' : 'var(--accent-blue)'
                  }}
                >
                  {repo.visibility}
                </span>
                <span>•</span>
                <span>{repo.language}</span>
                <span>•</span>
                <span>Last analyzed {repo.lastScanned}</span>
                <span>•</span>
                <span>{repo.size}</span>
              </div>
            </div>

            {/* Health badge */}
            <motion.div
              animate={{ opacity: repo.status === 'healthy' ? [0.7, 1, 0.7] : 1 }}
              transition={{ duration: 2, repeat: repo.status === 'healthy' ? Infinity : 0 }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full"
              style={{ backgroundColor: repo.statusColor + '20' }}
            >
              <div 
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: repo.statusColor }}
              />
              <span className="font-medium text-[14px]" style={{ color: repo.statusColor }}>
                {repo.statusLabel}
              </span>
            </motion.div>
          </div>
        </motion.div>

        {/* System Health Strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="rounded-[16px] p-6 mb-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          style={{ backgroundColor: 'var(--bg-soft)' }}
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              <span className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                PR Risk Score
              </span>
            </div>
            <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {repo.metrics.riskScore}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <TestTube2 className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              <span className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                Test Stability
              </span>
            </div>
            <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {repo.metrics.testStability}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              <span className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                Architecture Drift
              </span>
            </div>
            <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {repo.metrics.architectureDrift}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              <span className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                Last Autonomous Action
              </span>
            </div>
            <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {repo.metrics.lastAction}
            </div>
          </div>
        </motion.div>

        {/* Tri-Agent Launch Cards */}
        <div className="mb-12">
          <h2 
            className="text-2xl font-semibold mb-6"
            style={{ color: 'var(--text-primary)' }}
          >
            Agent Command Center
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
            {triAgentCards.map((card, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                whileHover={{ y: -6 }}
                className="bg-white rounded-[20px] border overflow-hidden transition-all hover:shadow-xl cursor-pointer"
                style={{ 
                  borderColor: 'var(--border-subtle)',
                  borderTopWidth: '4px',
                  borderTopColor: card.accentColor
                }}
              >
                <div className="p-7">
                  {/* Card header */}
                  <div className="flex items-start gap-3 mb-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: card.accentBg }}
                    >
                      <card.icon className="w-6 h-6" style={{ color: card.accentColor }} strokeWidth={2} />
                    </div>
                    <div>
                      <h3 
                        className="text-xl font-semibold mb-2"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {card.title}
                      </h3>
                    </div>
                  </div>

                  {/* Description */}
                  <p 
                    className="text-[14px] leading-relaxed mb-6"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {card.description}
                  </p>

                  {/* Visual placeholder */}
                  <div 
                    className="rounded-lg mb-5 flex items-center justify-center h-32"
                    style={{ backgroundColor: card.accentBg }}
                  >
                    <span 
                      className="text-[13px] font-medium"
                      style={{ color: card.accentColor }}
                    >
                      {card.previewLabel}
                    </span>
                  </div>

                  {/* Status line */}
                  <p 
                    className="text-[12px] mb-5"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {card.status}
                  </p>

                  {/* CTA */}
                  <button 
                    className="flex items-center gap-2 text-[14px] font-medium hover:gap-3 transition-all"
                    style={{ color: card.accentColor }}
                    onClick={card.action}
                  >
                    {card.cta}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Repo Insights Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Activity Graph */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="bg-white rounded-[18px] border p-6"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <h3 
              className="text-lg font-semibold mb-6"
              style={{ color: 'var(--text-primary)' }}
            >
              Repository Activity (30d)
            </h3>
            
            <div 
              className="rounded-lg flex items-center justify-center h-48"
              style={{ backgroundColor: 'var(--bg-soft)' }}
            >
              <Activity className="w-8 h-8 opacity-30" style={{ color: 'var(--text-secondary)' }} />
            </div>
          </motion.div>

          {/* Risk Summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="bg-white rounded-[18px] border p-6"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <h3 
              className="text-lg font-semibold mb-6"
              style={{ color: 'var(--text-primary)' }}
            >
              Risk Overview
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-[14px]" style={{ color: 'var(--text-primary)' }}>
                    Critical risks
                  </span>
                </div>
                <span className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {repo.risks.critical}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-[14px]" style={{ color: 'var(--text-primary)' }}>
                    Medium risks
                  </span>
                </div>
                <span className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {repo.risks.medium}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-gray-400" />
                  <span className="text-[14px]" style={{ color: 'var(--text-primary)' }}>
                    Low risks
                  </span>
                </div>
                <span className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {repo.risks.low}
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Activity Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="bg-white rounded-[18px] border p-8 mb-8"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <h3 
            className="text-xl font-semibold mb-6"
            style={{ color: 'var(--text-primary)' }}
          >
            Recent Autonomous Activity
          </h3>

          <div className="space-y-5">
            {activityItems.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-4 pb-5 border-b last:border-b-0"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                {/* Timeline dot */}
                <div className="relative flex-shrink-0">
                  <div 
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: item.color + '30' }}
                  >
                    <item.icon className="w-4 h-4" style={{ color: item.color }} />
                  </div>
                  {index !== activityItems.length - 1 && (
                    <div 
                      className="absolute left-1/2 top-9 w-px h-5 -translate-x-1/2"
                      style={{ backgroundColor: 'var(--border-subtle)' }}
                    />
                  )}
                </div>

                <div className="flex-1 pt-1">
                  <p className="text-[15px] mb-1" style={{ color: 'var(--text-primary)' }}>
                    {item.text}
                  </p>
                  <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                    {item.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Secondary Tools Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-5"
        >
          {[
            { icon: Settings, label: 'Repository Settings', color: 'var(--text-secondary)' },
            { icon: Webhook, label: 'Webhook Status', color: 'var(--text-secondary)' },
            { icon: Sliders, label: 'Agent Configuration', color: 'var(--text-secondary)' }
          ].map((tool, index) => (
            <div
              key={index}
              className="bg-white rounded-[14px] border p-5 flex items-center gap-3 cursor-pointer transition-all hover:shadow-md hover:-translate-y-1"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--bg-soft)' }}
              >
                <tool.icon className="w-5 h-5" style={{ color: tool.color }} />
              </div>
              <span className="font-medium text-[14px]" style={{ color: 'var(--text-primary)' }}>
                {tool.label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Minimal Footer */}
      <footer className="mt-16 py-8 px-6 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="max-w-[1280px] mx-auto flex items-center justify-between">
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            © Velocis
          </span>
          <div className="flex items-center gap-6">
            <a href="#" className="text-sm hover:opacity-70 transition-opacity" style={{ color: 'var(--text-secondary)' }}>
              Docs
            </a>
            <a href="#" className="text-sm hover:opacity-70 transition-opacity" style={{ color: 'var(--text-secondary)' }}>
              Security
            </a>
            <a href="#" className="text-sm hover:opacity-70 transition-opacity" style={{ color: 'var(--text-secondary)' }}>
              Status
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}