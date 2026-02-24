"use client";

import { motion } from 'motion/react';
import { TrendingDown, Zap, DollarSign, Activity } from 'lucide-react';

export function ServerlessEconomicsSection() {
  const benefits = [
    {
      icon: TrendingDown,
      title: 'No idle compute',
      description: 'Pay only when code is being analyzed or tests are running'
    },
    {
      icon: Zap,
      title: 'Event-driven',
      description: 'Webhooks trigger instant execution with zero warm-up time'
    },
    {
      icon: DollarSign,
      title: 'Predictable cost',
      description: 'Infrastructure spend scales linearly with actual usage'
    },
    {
      icon: Activity,
      title: 'Infra aware',
      description: 'Self-optimizing resource allocation based on workload'
    }
  ];

  return (
    <section className="py-28 px-6" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Content */}
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
              Scale-to-zero by design.
            </h2>

            <p 
              className="mb-10 text-[17px] leading-[1.6]"
              style={{ color: 'var(--text-secondary)' }}
            >
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
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'var(--accent-blue-soft)' }}
                  >
                    <benefit.icon 
                      className="w-5 h-5" 
                      style={{ color: 'var(--accent-blue)' }}
                      strokeWidth={2}
                    />
                  </div>
                  <div>
                    <p className="font-bold text-[14px] mb-1" style={{ color: 'var(--text-primary)' }}>
                      {benefit.title}
                    </p>
                    <p className="text-[13px] leading-[1.5]" style={{ color: 'var(--text-secondary)' }}>
                      {benefit.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right: Cost comparison visual */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="flex justify-center lg:justify-end"
          >
            <div className="w-full max-w-[480px]">
              <div 
                className="rounded-[18px] border p-8"
                style={{ 
                  backgroundColor: 'white',
                  borderColor: 'var(--border-subtle)'
                }}
              >
                <p 
                  className="text-xs font-bold tracking-wide uppercase mb-8 opacity-60"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Monthly Infrastructure Cost
                </p>

                {/* Traditional CI */}
                <div className="mb-10">
                  <div className="flex items-baseline justify-between mb-3">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Traditional CI
                    </span>
                    <span className="text-lg font-bold" style={{ color: '#dc2626' }}>
                      $489
                    </span>
                  </div>
                  <div className="relative h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-soft)' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: '100%' }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.3 }}
                      className="absolute left-0 top-0 bottom-0 rounded-full"
                      style={{ backgroundColor: '#dc2626' }}
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                      High baseline cost
                    </span>
                    <span className="text-[11px] font-semibold" style={{ color: '#dc2626' }}>
                      Always running
                    </span>
                  </div>
                </div>

                {/* Velocis */}
                <div>
                  <div className="flex items-baseline justify-between mb-3">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Velocis
                    </span>
                    <span className="text-lg font-bold" style={{ color: 'var(--accent-green)' }}>
                      $47
                    </span>
                  </div>
                  <div className="relative h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-soft)' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: '10%' }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className="absolute left-0 top-0 bottom-0 rounded-full"
                      style={{ backgroundColor: 'var(--accent-green)' }}
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                      Near-zero idle cost
                    </span>
                    <span className="text-[11px] font-semibold" style={{ color: 'var(--accent-green)' }}>
                      Event-driven
                    </span>
                  </div>
                </div>

                {/* Savings callout */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                  className="mt-8 pt-6 border-t flex items-center justify-between"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    You save
                  </span>
                  <div className="text-right">
                    <div className="text-2xl font-bold" style={{ color: 'var(--accent-green)' }}>
                      90%
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      on infrastructure
                    </div>
                  </div>
                </motion.div>

                {/* Micro chart indicator */}
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.9 }}
                  className="mt-6 text-center"
                >
                  <div className="text-[10px] font-medium tracking-wide uppercase opacity-40 mb-2" style={{ color: 'var(--text-primary)' }}>
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
                        className="w-2 rounded-t"
                        style={{ backgroundColor: i < 3 ? '#dc2626' : 'var(--accent-green)' }}
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