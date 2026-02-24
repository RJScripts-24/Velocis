"use client";

import { motion } from 'motion/react';
import { MessageSquare, Code, Sparkles } from 'lucide-react';

export function VibeCodingSection() {
  const benefits = [
    {
      icon: MessageSquare,
      color: 'var(--accent-green)',
      bgColor: 'var(--accent-green-soft)',
      title: 'Conversational code reviews',
      description: 'Ask questions, get explanations, understand trade-offs—all in real-time with full codebase context.'
    },
    {
      icon: Code,
      color: 'var(--accent-blue)',
      bgColor: 'var(--accent-blue-soft)',
      title: 'Context-aware suggestions',
      description: 'Recommendations based on your entire architecture, not just the current file or function.'
    },
    {
      icon: Sparkles,
      color: 'var(--accent-purple)',
      bgColor: 'var(--accent-purple-soft)',
      title: 'Instant refactoring',
      description: 'Apply architectural improvements with one click, backed by comprehensive test coverage.'
    }
  ];

  return (
    <section className="py-24 px-6" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <h2 
              className="mb-6 tracking-tight"
              style={{ 
                fontSize: '36px',
                fontWeight: 600,
                color: 'var(--text-primary)'
              }}
            >
              Stop reviewing code. Start collaborating with it.
            </h2>

            <p 
              className="mb-8 text-lg leading-[1.6]"
              style={{ color: 'var(--text-secondary)' }}
            >
              Velocis doesn't just flag issues—it understands context, suggests improvements, 
              and explains architectural implications in natural language. Every interaction makes 
              your codebase more maintainable.
            </p>

            <div className="space-y-5">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex items-start gap-4"
                >
                  <div 
                    className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: benefit.bgColor }}
                  >
                    <benefit.icon 
                      className="w-5 h-5" 
                      style={{ color: benefit.color }}
                      strokeWidth={2}
                    />
                  </div>
                  <div>
                    <p className="font-semibold mb-1.5 text-[15px]" style={{ color: 'var(--text-primary)' }}>
                      {benefit.title}
                    </p>
                    <p className="text-[14px] leading-[1.6]" style={{ color: 'var(--text-secondary)' }}>
                      {benefit.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right: Enhanced UI Mock */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="flex justify-center lg:justify-end"
          >
            <div 
              className="w-full max-w-[520px] rounded-[18px] border overflow-hidden shadow-2xl"
              style={{ 
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-subtle)'
              }}
            >
              {/* Window header */}
              <div className="border-b px-4 py-3.5 flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex items-center gap-2">
                  <motion.div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: 'var(--accent-purple)' }}
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    Sentinel reviewing PR #482...
                  </span>
                </div>
                <div className="w-16" />
              </div>

              {/* Split interface */}
              <div className="grid grid-cols-2">
                {/* Code Editor Side */}
                <div 
                  className="p-4 font-mono text-xs border-r"
                  style={{ 
                    backgroundColor: '#1a1a1a',
                    borderColor: 'rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <div className="space-y-1.5 text-gray-300">
                    <div className="text-gray-500">1</div>
                    <div className="text-gray-500">2</div>
                    <div className="text-yellow-400">3</div>
                    <div className="text-yellow-400">4</div>
                    <div className="text-yellow-400">5</div>
                    <div className="text-gray-500">6</div>
                    <div className="text-gray-500">7</div>
                    <div className="text-green-400">8</div>
                    <div className="text-green-400">9</div>
                    <div className="text-green-400">10</div>
                  </div>
                  <div className="absolute left-12 top-[72px] space-y-1.5 text-[11px]">
                    <div className="text-purple-400">export <span className="text-blue-400">function</span></div>
                    <div className="text-gray-300">  useAuthContext() {'{'}</div>
                    <div className="text-red-400 line-through opacity-60">  const [user, setUser] =</div>
                    <div className="text-red-400 line-through opacity-60">    useState(null)</div>
                    <div className="text-red-400 line-through opacity-60">  const [loading, set...] =</div>
                    <div className="text-gray-300">  </div>
                    <div className="text-gray-300">  {'  '}<span className="text-gray-500">// Refactored ↓</span></div>
                    <div className="text-green-400">  const [state, dispatch] =</div>
                    <div className="text-green-400">    useReducer(authReducer)</div>
                    <div className="text-green-400">  </div>
                  </div>
                </div>

                {/* Chat Side */}
                <div className="p-4 flex flex-col justify-between" style={{ backgroundColor: 'var(--bg-soft)' }}>
                  <div className="space-y-3">
                    {/* Assistant message */}
                    <div className="flex items-start gap-2">
                      <div 
                        className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: 'var(--accent-purple-soft)' }}
                      >
                        <span className="text-xs font-bold" style={{ color: 'var(--accent-purple)' }}>V</span>
                      </div>
                      <div 
                        className="flex-1 rounded-[10px] px-3 py-2 text-[11px] leading-[1.5]"
                        style={{ 
                          backgroundColor: 'white',
                          color: 'var(--text-primary)'
                        }}
                      >
                        Complex state detected. useReducer provides better type safety and testability here.
                      </div>
                    </div>

                    {/* Status badge */}
                    <div className="flex items-center gap-2 pl-8">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                        Refactored • Tests passing
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-4">
                    <button 
                      className="flex-1 px-3 py-2 rounded-[8px] text-[11px] font-semibold"
                      style={{ 
                        backgroundColor: 'var(--cta-primary)',
                        color: 'var(--cta-text)'
                      }}
                    >
                      Apply
                    </button>
                    <button 
                      className="px-3 py-2 rounded-[8px] text-[11px] font-medium"
                      style={{ 
                        backgroundColor: 'white',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      Explain
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}