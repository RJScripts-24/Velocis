"use client";

import { motion } from 'motion/react';
import { Bell, Search, CheckCircle, Shield, TestTube2, Eye, GitBranch, ChevronRight, TrendingUp, Activity } from 'lucide-react';
import { useNavigate } from 'react-router';

export function DashboardPage() {
  const navigate = useNavigate();

  const quickStats = [
    {
      title: 'Sentinel Reviews Today',
      value: '24',
      subtext: 'Across 6 repositories',
      accentColor: 'var(--accent-purple)',
      icon: Shield
    },
    {
      title: 'Tests Passing',
      value: '100%',
      subtext: 'Last 24 hours',
      accentColor: 'var(--accent-blue)',
      icon: TestTube2
    },
    {
      title: 'Services Mapped',
      value: '142',
      subtext: 'Live architecture graph',
      accentColor: 'var(--accent-green)',
      icon: Eye
    },
    {
      title: 'Open Risks',
      value: '3',
      subtext: 'Requires attention',
      accentColor: '#dc2626',
      icon: TrendingUp
    }
  ];

  const repositories = [
    {
      name: 'InfraZero',
      id: 'infrazero',
      status: 'healthy',
      statusColor: '#22c55e',
      sentinel: '2 PRs reviewed today',
      fortress: '100% tests passing',
      cortex: 'Architecture up to date',
      sparklineData: [20, 35, 28, 42, 38, 45, 40]
    },
    {
      name: 'Immersa',
      id: 'immersa',
      status: 'healthy',
      statusColor: '#22c55e',
      sentinel: '1 PR reviewed today',
      fortress: '98% tests passing',
      cortex: 'Architecture up to date',
      sparklineData: [15, 22, 28, 25, 32, 30, 28]
    },
    {
      name: 'velocis-core',
      id: 'velocis-core',
      status: 'warning',
      statusColor: '#eab308',
      sentinel: '3 PRs reviewed today',
      fortress: '2 flaky tests detected',
      cortex: 'Architecture updated 2h ago',
      sparklineData: [30, 28, 35, 40, 38, 42, 45]
    },
    {
      name: 'ai-observatory',
      id: 'ai-observatory',
      status: 'healthy',
      statusColor: '#22c55e',
      sentinel: 'No activity today',
      fortress: '100% tests passing',
      cortex: 'Architecture up to date',
      sparklineData: [10, 12, 8, 15, 18, 14, 16]
    },
    {
      name: 'distributed-lab',
      id: 'distributed-lab',
      status: 'attention',
      statusColor: '#dc2626',
      sentinel: '1 high-risk issue found',
      fortress: '85% tests passing',
      cortex: 'Complexity spike detected',
      sparklineData: [25, 30, 35, 42, 48, 52, 55]
    },
    {
      name: 'test-sandbox',
      id: 'test-sandbox',
      status: 'healthy',
      statusColor: '#22c55e',
      sentinel: '4 PRs reviewed today',
      fortress: '100% tests passing',
      cortex: 'Architecture up to date',
      sparklineData: [18, 22, 20, 28, 25, 30, 32]
    }
  ];

  const activityItems = [
    {
      icon: Shield,
      color: 'var(--accent-purple)',
      text: 'Sentinel flagged potential race condition in InfraZero',
      time: '12 minutes ago'
    },
    {
      icon: TestTube2,
      color: 'var(--accent-blue)',
      text: 'Fortress auto-fixed failing test in velocis-core',
      time: '1 hour ago'
    },
    {
      icon: Eye,
      color: 'var(--accent-green)',
      text: 'Visual Cortex updated service graph',
      time: '2 hours ago'
    },
    {
      icon: Shield,
      color: 'var(--accent-purple)',
      text: 'Sentinel completed review on PR #482',
      time: '3 hours ago'
    },
    {
      icon: TestTube2,
      color: 'var(--accent-blue)',
      text: 'Fortress ran 247 tests across 3 repositories',
      time: '5 hours ago'
    }
  ];

  const Sparkline = ({ data }: { data: number[] }) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min;
    
    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((val - min) / range) * 100;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width="100%" height="32" viewBox="0 0 100 100" preserveAspectRatio="none" className="opacity-60">
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-soft)' }}>
      {/* App Navbar */}
      <nav 
        className="sticky top-0 z-50 border-b bg-white"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
          {/* Left */}
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
            <span 
              className="px-2 py-1 rounded text-[10px] font-medium tracking-wide"
              style={{ backgroundColor: 'var(--bg-soft)', color: 'var(--text-secondary)' }}
            >
              PRODUCTION
            </span>
          </div>

          {/* Center - Search */}
          <div className="hidden md:block relative">
            <Search 
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: 'var(--text-secondary)' }}
            />
            <input
              type="text"
              placeholder="Search repositories…"
              className="pl-10 pr-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-all w-[280px]"
              style={{ 
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-soft)',
                color: 'var(--text-primary)'
              }}
            />
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
      <div className="max-w-[1280px] mx-auto px-6 py-8">
        {/* Welcome / System Status Strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-[16px] p-6 mb-8 flex items-center justify-between"
          style={{ backgroundColor: 'var(--bg-soft)' }}
        >
          <div>
            <h1 
              className="text-2xl font-semibold mb-1"
              style={{ color: 'var(--text-primary)' }}
            >
              Welcome back, Rishabh.
            </h1>
            <p className="text-[15px]" style={{ color: 'var(--text-secondary)' }}>
              Velocis is actively monitoring your connected repositories.
            </p>
          </div>

          {/* Live pulse indicator */}
          <div 
            className="flex items-center gap-2 px-4 py-2 rounded-full"
            style={{ backgroundColor: 'var(--accent-green-soft)' }}
          >
            <motion.div
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: 'var(--accent-green)' }}
            />
            <span className="text-sm font-medium" style={{ color: 'var(--accent-green)' }}>
              All systems operational
            </span>
          </div>
        </motion.div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {quickStats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 + index * 0.05 }}
              whileHover={{ y: -2 }}
              className="bg-white rounded-[16px] border p-5 transition-all"
              style={{ 
                borderColor: 'var(--border-subtle)',
                borderTopWidth: '3px',
                borderTopColor: stat.accentColor
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {stat.title}
                </span>
                <stat.icon className="w-4 h-4" style={{ color: stat.accentColor }} strokeWidth={2} />
              </div>
              <div className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                {stat.value}
              </div>
              <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                {stat.subtext}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Grid - Repositories and Activity Feed */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-8">
          {/* Repository Grid */}
          <div>
            <h2 
              className="text-xl font-semibold mb-5"
              style={{ color: 'var(--text-primary)' }}
            >
              Your Repositories
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
              {repositories.map((repo, index) => (
                <motion.div
                  key={repo.name}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + index * 0.05 }}
                  whileHover={{ y: -4 }}
                  onClick={() => navigate(`/repo/${repo.id}`)}
                  className="bg-white rounded-[18px] border p-6 transition-all hover:shadow-lg cursor-pointer"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: 'var(--bg-soft)' }}
                      >
                        <GitBranch className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                      </div>
                      <span className="font-semibold text-[16px]" style={{ color: 'var(--text-primary)' }}>
                        {repo.name}
                      </span>
                    </div>
                    
                    {/* Status dot */}
                    <motion.div
                      animate={{ opacity: [0.6, 1, 0.6] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: repo.statusColor }}
                    />
                  </div>

                  {/* Agent Status Block */}
                  <div className="space-y-3 mb-5 pb-5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                    {/* Sentinel */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-6 h-6 rounded-md flex items-center justify-center"
                          style={{ backgroundColor: 'var(--accent-purple-soft)' }}
                        >
                          <Shield className="w-3.5 h-3.5" style={{ color: 'var(--accent-purple)' }} />
                        </div>
                        <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                          Sentinel
                        </span>
                      </div>
                      <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                        {repo.sentinel}
                      </span>
                    </div>

                    {/* Fortress */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-6 h-6 rounded-md flex items-center justify-center"
                          style={{ backgroundColor: 'var(--accent-blue-soft)' }}
                        >
                          <TestTube2 className="w-3.5 h-3.5" style={{ color: 'var(--accent-blue)' }} />
                        </div>
                        <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                          Fortress
                        </span>
                      </div>
                      <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                        {repo.fortress}
                      </span>
                    </div>

                    {/* Visual Cortex */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-6 h-6 rounded-md flex items-center justify-center"
                          style={{ backgroundColor: 'var(--accent-green-soft)' }}
                        >
                          <Eye className="w-3.5 h-3.5" style={{ color: 'var(--accent-green)' }} />
                        </div>
                        <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                          Visual Cortex
                        </span>
                      </div>
                      <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                        {repo.cortex}
                      </span>
                    </div>
                  </div>

                  {/* Mini Activity Sparkline */}
                  <div className="mb-4">
                    <div style={{ color: 'var(--text-secondary)' }}>
                      <Sparkline data={repo.sparklineData} />
                    </div>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                      Activity (7d)
                    </p>
                  </div>

                  {/* Card Footer Action */}
                  <button 
                    className="flex items-center gap-1 text-[13px] font-medium hover:gap-2 transition-all ml-auto"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    View Details
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Activity Feed */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-white rounded-[18px] border p-6 h-fit"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <h3 
              className="text-lg font-semibold mb-5"
              style={{ color: 'var(--text-primary)' }}
            >
              Recent Velocis Activity
            </h3>

            <div className="space-y-4">
              {activityItems.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 + index * 0.08 }}
                  className="pb-4 border-b last:border-b-0"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: item.color + '30' }}
                    >
                      <item.icon className="w-4 h-4" style={{ color: item.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] leading-relaxed mb-1" style={{ color: 'var(--text-primary)' }}>
                        {item.text}
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                        {item.time}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
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
              Status
            </a>
            <a href="#" className="text-sm hover:opacity-70 transition-opacity" style={{ color: 'var(--text-secondary)' }}>
              Security
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}