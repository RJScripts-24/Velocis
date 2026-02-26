"use client";

import { motion } from 'motion/react';
import { MessageSquare, Code, Sparkles } from 'lucide-react';

interface BenefitItem {
  icon: typeof MessageSquare;
  color: string;
  bgColor: string;
  title: string;
  description: string;
}

const benefits: BenefitItem[] = [
  {
    icon: MessageSquare,
    color: 'var(--accent-green)',
    bgColor: 'var(--accent-green-soft)',
    title: 'Conversational code reviews',
    description: 'Ask questions, get explanations, understand trade-offs—all in real-time with full codebase context.',
  },
  {
    icon: Code,
    color: 'var(--accent-blue)',
    bgColor: 'var(--accent-blue-soft)',
    title: 'Context-aware suggestions',
    description: 'Recommendations based on your entire architecture, not just the current file or function.',
  },
  {
    icon: Sparkles,
    color: 'var(--accent-purple)',
    bgColor: 'var(--accent-purple-soft)',
    title: 'Instant refactoring',
    description: 'Apply architectural improvements with one click, backed by comprehensive test coverage.',
  },
];

export function VibeCodingSection() {
  return (
    <section className="v-section-major bg-[--bg-primary]" aria-label="Collaborative coding">
      <div className="v-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-6 text-[--text-primary]">
              Stop reviewing code. Start collaborating with it.
            </h2>

            <p className="mb-8 text-lg leading-[1.6] text-[--text-secondary]">
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
                    className="w-10 h-10 rounded-[--radius-md] flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: benefit.bgColor }}
                  >
                    <benefit.icon className="w-5 h-5" style={{ color: benefit.color }} strokeWidth={2} />
                  </div>
                  <div>
                    <p className="font-semibold mb-1.5 text-[15px] text-[--text-primary]">{benefit.title}</p>
                    <p className="text-[14px] leading-[1.6] text-[--text-secondary]">{benefit.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right: UI Mock */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="flex justify-center lg:justify-end"
          >
            <div className="w-full max-w-[520px] rounded-[--radius-2xl] border border-[--border-subtle] overflow-hidden shadow-2xl bg-[--bg-primary]">
              {/* Window header */}
              <div className="border-b border-[--border-subtle] px-4 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex items-center gap-2">
                  <motion.div
                    className="w-2 h-2 rounded-full bg-[--accent-purple]"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <span className="text-[11px] font-semibold text-[--text-secondary]">
                    Sentinel reviewing PR #482...
                  </span>
                </div>
                <div className="w-16" />
              </div>

              {/* Split interface */}
              <div className="grid grid-cols-2">
                {/* Code Editor Side */}
                <div className="p-4 font-mono text-xs border-r bg-[#1a1a1a] border-white/10">
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
                <div className="p-4 flex flex-col justify-between bg-[--bg-soft]">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-[--radius-md] flex items-center justify-center flex-shrink-0 mt-0.5 bg-[--accent-purple-soft]">
                        <span className="text-xs font-bold text-[--accent-purple]">V</span>
                      </div>
                      <div className="flex-1 rounded-[--radius-md] px-3 py-2 text-[11px] leading-[1.5] bg-white text-[--text-primary]">
                        Complex state detected. useReducer provides better type safety and testability here.
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pl-8">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span className="text-[10px] font-medium text-[--text-secondary]">Refactored • Tests passing</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button className="flex-1 px-3 py-2 rounded-[--radius-md] text-[11px] font-semibold bg-[--cta-primary] text-[--cta-text]">
                      Apply
                    </button>
                    <button className="px-3 py-2 rounded-[--radius-md] text-[11px] font-medium bg-white text-[--text-secondary]">
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