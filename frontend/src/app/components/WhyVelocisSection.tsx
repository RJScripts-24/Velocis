"use client";

import { motion } from 'motion/react';
import { AlertCircle, Users, Eye, GitBranch } from 'lucide-react';

export function WhyVelocisSection() {
  const problems = [
    {
      icon: Users,
      title: 'Junior output gap',
      description: 'Growing teams produce code faster than senior engineers can review it with depth.'
    },
    {
      icon: AlertCircle,
      title: 'Senior review overload',
      description: 'Best engineers spend 40% of time on code review instead of architecture work.'
    },
    {
      icon: Eye,
      title: 'Architecture visibility problem',
      description: 'Dependencies and technical debt compound silently across sprints.'
    },
    {
      icon: GitBranch,
      title: 'QA fragmentation',
      description: 'Test coverage becomes inconsistent as velocity scales beyond manual oversight.'
    }
  ];

  return (
    <section className="py-24 px-6" style={{ backgroundColor: 'var(--bg-soft)' }}>
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Narrative */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <h2 
              className="mb-6 tracking-tight"
              style={{ 
                fontSize: '38px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em'
              }}
            >
              The seniority bottleneck is slowing modern teams.
            </h2>

            <p 
              className="mb-10 text-[17px] leading-[1.6]"
              style={{ color: 'var(--text-secondary)' }}
            >
              As engineering teams scale, the gap between code production and meaningful review widens. 
              Traditional CI/CD catches syntax errors but misses architectural risks, security vulnerabilities, 
              and accumulating technical debt. Senior engineers become review bottlenecks instead of force 
              multipliers.
            </p>

            {/* Problem grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {problems.map((problem, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div 
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                  >
                    <problem.icon 
                      className="w-4 h-4" 
                      style={{ color: '#dc2626' }}
                      strokeWidth={2}
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-[14px] mb-1" style={{ color: 'var(--text-primary)' }}>
                      {problem.title}
                    </p>
                    <p className="text-[13px] leading-[1.5]" style={{ color: 'var(--text-secondary)' }}>
                      {problem.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right: Visual diagram */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="flex justify-center lg:justify-end"
          >
            <div className="w-full max-w-[440px]">
              {/* Before Velocis */}
              <div 
                className="rounded-[16px] border p-6 mb-8"
                style={{ 
                  backgroundColor: 'white',
                  borderColor: 'var(--border-subtle)'
                }}
              >
                <p 
                  className="text-xs font-semibold tracking-wide uppercase mb-5 opacity-50"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Before Velocis
                </p>
                
                <div className="flex flex-col gap-3">
                  {['Dev', 'PR', 'Manual Review', 'QA', 'Prod bugs'].map((step, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div 
                        className="flex-1 rounded-lg px-4 py-3 text-sm font-medium"
                        style={{ 
                          backgroundColor: '#f3f4f6',
                          color: '#6b7280'
                        }}
                      >
                        {step}
                      </div>
                      {index < 4 && (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path 
                            d="M8 3L8 13M8 13L12 9M8 13L4 9" 
                            stroke="#9ca3af" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Divider line */}
              <div className="flex items-center gap-3 mb-8">
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
                <span className="text-xs font-medium opacity-40" style={{ color: 'var(--text-primary)' }}>
                  WITH VELOCIS
                </span>
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
              </div>

              {/* After Velocis */}
              <div 
                className="rounded-[16px] border-2 p-6"
                style={{ 
                  backgroundColor: 'var(--accent-green-soft)',
                  borderColor: 'var(--accent-green)'
                }}
              >
                <p 
                  className="text-xs font-semibold tracking-wide uppercase mb-5"
                  style={{ color: 'var(--accent-green)' }}
                >
                  After Velocis
                </p>
                
                <div className="flex flex-col gap-3">
                  {['Dev', 'Velocis', 'Confidence'].map((step, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div 
                        className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold ${
                          step === 'Velocis' ? 'ring-2' : ''
                        }`}
                        style={{ 
                          backgroundColor: step === 'Velocis' ? 'var(--accent-green)' : 'white',
                          color: step === 'Velocis' ? 'white' : 'var(--text-primary)',
                          ringColor: step === 'Velocis' ? 'var(--accent-green)' : 'transparent'
                        }}
                      >
                        {step}
                      </div>
                      {index < 2 && (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path 
                            d="M8 3L8 13M8 13L12 9M8 13L4 9" 
                            stroke="currentColor"
                            style={{ color: 'var(--accent-green)' }}
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
