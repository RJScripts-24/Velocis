"use client";

import { motion } from 'motion/react';
import { Shield, Castle, Eye, Check } from 'lucide-react';

export function TriAgentSection() {
  const agents = [
    {
      icon: Shield,
      badge: 'Reviewer AI',
      title: 'Sentinel',
      subtitle: 'The Guardian',
      bgColor: 'var(--accent-purple-soft)',
      iconColor: 'var(--accent-purple)',
      badgeColor: 'rgba(168, 85, 247, 0.15)',
      description: 'Deep semantic code review that goes beyond syntax checking. Sentinel understands intent, architectural patterns, and security implications across your entire codebase. It provides multilingual mentorship with context-aware suggestions that consider your team coding standards and historical patterns. Every review includes risk assessment and impact analysis.',
      capabilities: [
        { col1: 'Deep semantic review', col2: 'Security heuristics' },
        { col1: 'Scale risk detection', col2: 'Multilingual guidance' },
        { col1: 'Pattern recognition', col2: 'Context preservation' }
      ],
      triggers: ['PR opened', 'Commit pushed', 'Comment requested']
    },
    {
      icon: Castle,
      badge: 'QA Engine',
      title: 'Fortress',
      subtitle: 'Autonomous QA',
      bgColor: 'var(--accent-blue-soft)',
      iconColor: 'var(--accent-blue)',
      badgeColor: 'rgba(59, 130, 246, 0.15)',
      description: 'Zero-touch test generation and execution orchestrated through AWS Step Functions. Fortress writes comprehensive tests, runs them in isolated environments, heals failures automatically, and maintains continuous validation across your entire codebase. It learns from your testing patterns and adapts coverage to code complexity. Self-healing capabilities detect and fix flaky tests before they block deployment.',
      capabilities: [
        { col1: 'Zero-touch TDD', col2: 'Self-healing tests' },
        { col1: 'Step Functions orchestration', col2: 'Isolated execution' },
        { col1: 'Coverage intelligence', col2: 'Failure prediction' }
      ],
      triggers: ['Test fails', 'New code path', 'Deployment initiated']
    },
    {
      icon: Eye,
      badge: 'Architecture Engine',
      title: 'Visual Cortex',
      subtitle: 'Architecture Intelligence',
      bgColor: 'var(--accent-green-soft)',
      iconColor: 'var(--accent-green)',
      badgeColor: 'rgba(34, 197, 94, 0.15)',
      description: 'Live 3D visualization of your codebase as an interactive architectural city. Visual Cortex maintains real-time dependency mapping, identifies bottlenecks instantly, and detects failures through spatial intelligence. Every service, module, and function is represented spatially with visual signals for health, complexity, and change frequency. Dramatically accelerates onboarding and debugging by making architecture tangible.',
      capabilities: [
        { col1: 'Live 3D codebase city', col2: 'Real-time dependency map' },
        { col1: 'Instant failure signals', col2: 'Complexity heatmaps' },
        { col1: 'Accelerated onboarding', col2: 'Spatial debugging' }
      ],
      triggers: ['Service changes', 'Dependency added', 'Architecture query']
    }
  ];

  return (
    <section className="py-28 px-6" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-[1200px] mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 max-w-[820px] mx-auto"
        >
          <h2 
            className="mb-5 tracking-tight"
            style={{ 
              fontSize: '38px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em'
            }}
          >
            A closed-loop autonomous engineering system
          </h2>
          <p 
            className="text-lg leading-[1.6]"
            style={{ color: 'var(--text-secondary)' }}
          >
            Three specialized AI agents form a continuous feedback loop—analyzing code quality in real-time, 
            executing comprehensive test suites, and maintaining live architecture visualization with every commit.
          </p>
        </motion.div>

        {/* Agent Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {agents.map((agent, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              whileHover={{ 
                y: -6, 
                borderColor: agent.iconColor,
                transition: { duration: 0.25 }
              }}
              className="rounded-[18px] p-8 border-2 transition-all bg-white"
              style={{ 
                borderColor: 'var(--border-subtle)'
              }}
            >
              {/* Top badge */}
              <div 
                className="inline-block px-3 py-1.5 rounded-full mb-5 text-[11px] font-bold tracking-wide"
                style={{ 
                  backgroundColor: agent.badgeColor,
                  color: agent.iconColor
                }}
              >
                {agent.badge}
              </div>

              {/* Icon */}
              <div 
                className="w-14 h-14 rounded-[14px] flex items-center justify-center mb-5"
                style={{ backgroundColor: agent.bgColor }}
              >
                <agent.icon 
                  className="w-7 h-7" 
                  style={{ color: agent.iconColor }} 
                  strokeWidth={2}
                />
              </div>

              {/* Title */}
              <div className="mb-5">
                <h3 
                  className="text-xl font-bold mb-1"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {agent.title}
                </h3>
                <p 
                  className="text-sm font-semibold"
                  style={{ color: agent.iconColor }}
                >
                  {agent.subtitle}
                </p>
              </div>

              {/* Expanded Description */}
              <p 
                className="mb-6 text-[14px] leading-[1.7]"
                style={{ color: 'var(--text-secondary)' }}
              >
                {agent.description}
              </p>

              {/* Capability grid */}
              <div 
                className="pt-5 pb-5 border-t border-b mb-5"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <div className="space-y-3">
                  {agent.capabilities.map((row, i) => (
                    <div key={i} className="grid grid-cols-2 gap-2">
                      <div className="flex items-start gap-1.5">
                        <div 
                          className="w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: agent.bgColor }}
                        >
                          <Check 
                            className="w-2.5 h-2.5" 
                            style={{ color: agent.iconColor }}
                            strokeWidth={3}
                          />
                        </div>
                        <span 
                          className="text-[12px] font-medium leading-tight"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {row.col1}
                        </span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <div 
                          className="w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: agent.bgColor }}
                        >
                          <Check 
                            className="w-2.5 h-2.5" 
                            style={{ color: agent.iconColor }}
                            strokeWidth={3}
                          />
                        </div>
                        <span 
                          className="text-[12px] font-medium leading-tight"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {row.col2}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Triggers when */}
              <div>
                <p 
                  className="text-[11px] font-bold tracking-wide uppercase mb-2.5"
                  style={{ color: 'var(--text-primary)', opacity: 0.5 }}
                >
                  Triggers when:
                </p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {agent.triggers.map((trigger, i) => (
                    <div
                      key={i}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium"
                      style={{ 
                        backgroundColor: agent.bgColor,
                        color: agent.iconColor
                      }}
                    >
                      <span>→</span>
                      <span>{trigger}</span>
                    </div>
                  ))}
                </div>

                {/* Explore link */}
                <a
                  href="#"
                  className="inline-flex items-center gap-2 text-[13px] font-medium hover:gap-3 transition-all"
                  style={{ color: agent.iconColor }}
                >
                  <span>Explore how {agent.title} works</span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path 
                      d="M1 7h12M7 1l6 6-6 6" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}