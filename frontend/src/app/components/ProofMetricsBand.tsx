"use client";

import { motion } from 'motion/react';

interface MetricPillData {
  text: string;
  value: string;
  bgColor: string;
  textColor: string;
}

const metricsRow1: MetricPillData[] = [
  { text: 'PR review time', value: '↓ 68%', bgColor: 'var(--accent-purple-soft)', textColor: 'var(--accent-purple)' },
  { text: 'Test coverage', value: '↑ 52%', bgColor: 'var(--accent-blue-soft)', textColor: 'var(--accent-blue)' },
  { text: 'Critical bugs caught', value: '3×', bgColor: 'var(--accent-green-soft)', textColor: 'var(--accent-green)' },
];

const metricsRow2: MetricPillData[] = [
  { text: 'Mean time to detect', value: '↓ 41%', bgColor: 'var(--accent-green-soft)', textColor: 'var(--accent-green)' },
  { text: 'Manual QA effort', value: '↓ 57%', bgColor: 'var(--accent-purple-soft)', textColor: 'var(--accent-purple)' },
  { text: 'Onboarding time', value: '↓ 35%', bgColor: 'var(--accent-blue-soft)', textColor: 'var(--accent-blue)' },
];

function MetricPill({ metric, index, rowDelay = 0 }: { metric: MetricPillData; index: number; rowDelay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5, delay: rowDelay + index * 0.1 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="rounded-[--radius-xl] px-6 py-5 cursor-default v-card-hover"
      style={{ backgroundColor: metric.bgColor }}
    >
      <div className="text-center">
        <div className="text-[15px] font-medium mb-0.5 text-[--text-primary]">{metric.text}</div>
        <div className="text-2xl font-bold" style={{ color: metric.textColor }}>{metric.value}</div>
      </div>
    </motion.div>
  );
}

export function ProofMetricsBand() {
  return (
    <section className="v-section-medium" aria-label="Key metrics">
      <div className="v-container">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          {metricsRow1.map((metric, index) => (
            <MetricPill key={index} metric={metric} index={index} rowDelay={0} />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {metricsRow2.map((metric, index) => (
            <MetricPill key={index} metric={metric} index={index} rowDelay={0.3} />
          ))}
        </div>
      </div>
    </section>
  );
}
