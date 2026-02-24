"use client";

import { motion } from 'motion/react';

export function ProofMetricsBand() {
  const metricsRow1 = [
    {
      text: 'PR review time',
      value: '↓ 68%',
      bgColor: 'var(--accent-purple-soft)',
      textColor: 'var(--accent-purple)'
    },
    {
      text: 'Test coverage',
      value: '↑ 52%',
      bgColor: 'var(--accent-blue-soft)',
      textColor: 'var(--accent-blue)'
    },
    {
      text: 'Critical bugs caught',
      value: '3×',
      bgColor: 'var(--accent-green-soft)',
      textColor: 'var(--accent-green)'
    }
  ];

  const metricsRow2 = [
    {
      text: 'Mean time to detect',
      value: '↓ 41%',
      bgColor: 'var(--accent-green-soft)',
      textColor: 'var(--accent-green)'
    },
    {
      text: 'Manual QA effort',
      value: '↓ 57%',
      bgColor: 'var(--accent-purple-soft)',
      textColor: 'var(--accent-purple)'
    },
    {
      text: 'Onboarding time',
      value: '↓ 35%',
      bgColor: 'var(--accent-blue-soft)',
      textColor: 'var(--accent-blue)'
    }
  ];

  const MetricPill = ({ metric, index, rowDelay = 0 }: { metric: any; index: number; rowDelay?: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5, delay: rowDelay + index * 0.1 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="rounded-[14px] px-6 py-5 transition-all cursor-default"
      style={{ backgroundColor: metric.bgColor }}
    >
      <div className="text-center">
        <div className="text-[15px] font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>
          {metric.text}
        </div>
        <div 
          className="text-2xl font-bold"
          style={{ color: metric.textColor }}
        >
          {metric.value}
        </div>
      </div>
    </motion.div>
  );

  return (
    <section className="py-20 px-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
          {metricsRow1.map((metric, index) => (
            <MetricPill key={index} metric={metric} index={index} rowDelay={0} />
          ))}
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {metricsRow2.map((metric, index) => (
            <MetricPill key={index} metric={metric} index={index} rowDelay={0.3} />
          ))}
        </div>
      </div>
    </section>
  );
}
