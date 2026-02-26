"use client";

import { motion } from 'motion/react';
import { TrendingDown, Zap, DollarSign, Activity } from 'lucide-react';

const benefits = [
  { icon: TrendingDown, title: 'No idle compute', description: 'Pay only when code is being analyzed or tests are running' },
  { icon: Zap, title: 'Event-driven', description: 'Webhooks trigger instant execution with zero warm-up time' },
  { icon: DollarSign, title: 'Predictable cost', description: 'Infrastructure spend scales linearly with actual usage' },
  { icon: Activity, title: 'Infra aware', description: 'Self-optimizing resource allocation based on workload' },
];

export function ServerlessEconomicsSection() {
  return (
    <section className="v-section-major bg-[--bg-primary]" aria-label="Serverless economics">
      <div className="v-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-6 text-[--text-primary]">
              Scale-to-zero by design.
            </h2>

            <p className="mb-10 text-[17px] leading-[1.6] text-[--text-secondary]">
              Traditional CI/CD platforms charge for idle compute—servers waiting for work that may never
              come. Velocis runs entirely on serverless infrastructure that scales to zero when not in use,
              then spins up instantly when triggered by webhooks. You pay only for actual analysis and testing time.
            </p>

            {/* Benefits grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-10 h-10 rounded-[--radius-md] flex items-center justify-center flex-shrink-0 bg-[--accent-blue-soft]">
                    <benefit.icon className="w-5 h-5 text-[--accent-blue]" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="font-bold text-[14px] mb-1 text-[--text-primary]">{benefit.title}</p>
                    <p className="text-[13px] leading-[1.5] text-[--text-secondary]">{benefit.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right: Cost comparison */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="flex justify-center lg:justify-end"
          >
            <div className="w-full max-w-[480px]">
              <div className="rounded-[--radius-2xl] border border-[--border-subtle] p-8 bg-white">
                <p className="text-xs font-bold tracking-wide uppercase mb-8 text-[--text-primary] opacity-60">
                  Monthly Infrastructure Cost
                </p>

                {/* Traditional CI */}
                <div className="mb-10">
                  <div className="flex items-baseline justify-between mb-3">
                    <span className="text-sm font-semibold text-[--text-primary]">Traditional CI</span>
                    <span className="text-lg font-bold text-red-600">$489</span>
                  </div>
                  <div className="relative h-3 rounded-full overflow-hidden bg-[--bg-soft]">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: '100%' }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.3 }}
                      className="absolute left-0 top-0 bottom-0 rounded-full bg-red-600"
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-[11px] text-[--text-secondary]">High baseline cost</span>
                    <span className="text-[11px] font-semibold text-red-600">Always running</span>
                  </div>
                </div>

                {/* Velocis */}
                <div>
                  <div className="flex items-baseline justify-between mb-3">
                    <span className="text-sm font-semibold text-[--text-primary]">Velocis</span>
                    <span className="text-lg font-bold text-[--accent-green]">$47</span>
                  </div>
                  <div className="relative h-3 rounded-full overflow-hidden bg-[--bg-soft]">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: '10%' }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className="absolute left-0 top-0 bottom-0 rounded-full bg-[--accent-green]"
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-[11px] text-[--text-secondary]">Near-zero idle cost</span>
                    <span className="text-[11px] font-semibold text-[--accent-green]">Event-driven</span>
                  </div>
                </div>

                {/* Savings callout */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                  className="mt-8 pt-6 border-t border-[--border-subtle] flex items-center justify-between"
                >
                  <span className="text-sm font-medium text-[--text-secondary]">You save</span>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-[--accent-green]">90%</div>
                    <div className="text-xs text-[--text-secondary]">on infrastructure</div>
                  </div>
                </motion.div>

                {/* Micro chart */}
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.9 }}
                  className="mt-6 text-center"
                >
                  <div className="text-[10px] font-medium tracking-wide uppercase text-[--text-primary] opacity-40 mb-2">
                    Cost Comparison Graph
                  </div>
                  <div className="flex items-end justify-center gap-2 h-12">
                    {[100, 95, 88, 75, 60, 42, 28, 15, 10, 10].map((height, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        whileInView={{ height: `${height}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 1 + i * 0.05 }}
                        className={`w-2 rounded-t ${i < 3 ? 'bg-red-600' : 'bg-[--accent-green]'}`}
                      />
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}