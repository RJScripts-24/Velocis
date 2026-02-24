"use client";

import { motion } from 'motion/react';
import { AlertCircle, Users, Eye, GitBranch } from 'lucide-react';

const problems = [
  { icon: Users, title: 'Junior output gap', description: 'Growing teams produce code faster than senior engineers can review it with depth.' },
  { icon: AlertCircle, title: 'Senior review overload', description: 'Best engineers spend 40% of time on code review instead of architecture work.' },
  { icon: Eye, title: 'Architecture visibility problem', description: 'Dependencies and technical debt compound silently across sprints.' },
  { icon: GitBranch, title: 'QA fragmentation', description: 'Test coverage becomes inconsistent as velocity scales beyond manual oversight.' },
];

export function WhyVelocisSection() {
  return (
    <section className="bg-[--bg-soft] v-section-major" aria-label="Why Velocis">
      <div className="v-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Narrative */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-6 text-[--text-primary]">
              The seniority bottleneck is slowing modern teams.
            </h2>

            <p className="mb-10 text-[17px] leading-[1.6] text-[--text-secondary]">
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
                  <div className="w-9 h-9 rounded-[--radius-md] flex items-center justify-center flex-shrink-0 mt-0.5 bg-red-50">
                    <problem.icon className="w-4 h-4 text-red-600" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="font-semibold text-[14px] mb-1 text-[--text-primary]">{problem.title}</p>
                    <p className="text-[13px] leading-[1.5] text-[--text-secondary]">{problem.description}</p>
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
              <div className="rounded-[--radius-2xl] border border-[--border-subtle] p-6 mb-8 bg-white">
                <p className="text-xs font-semibold tracking-wide uppercase mb-5 text-[--text-primary] opacity-50">
                  Before Velocis
                </p>
                <div className="flex flex-col gap-3">
                  {['Dev', 'PR', 'Manual Review', 'QA', 'Prod bugs'].map((step, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="flex-1 rounded-[--radius-md] px-4 py-3 text-sm font-medium bg-gray-100 text-gray-500">
                        {step}
                      </div>
                      {index < 4 && (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path d="M8 3L8 13M8 13L12 9M8 13L4 9" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-8">
                <div className="flex-1 h-px bg-[--border-subtle]" />
                <span className="text-xs font-medium text-[--text-primary] opacity-40">WITH VELOCIS</span>
                <div className="flex-1 h-px bg-[--border-subtle]" />
              </div>

              {/* After Velocis */}
              <div className="rounded-[--radius-2xl] border-2 border-[--accent-green] p-6 bg-[--accent-green-soft]">
                <p className="text-xs font-semibold tracking-wide uppercase mb-5 text-[--accent-green]">
                  After Velocis
                </p>
                <div className="flex flex-col gap-3">
                  {['Dev', 'Velocis', 'Confidence'].map((step, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div
                        className={`flex-1 rounded-[--radius-md] px-4 py-3 text-sm font-semibold ${step === 'Velocis'
                            ? 'bg-[--accent-green] text-white ring-2 ring-[--accent-green]'
                            : 'bg-white text-[--text-primary]'
                          }`}
                      >
                        {step}
                      </div>
                      {index < 2 && (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path d="M8 3L8 13M8 13L12 9M8 13L4 9" stroke="var(--accent-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
