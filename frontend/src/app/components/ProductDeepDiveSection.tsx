"use client";

import { motion } from 'motion/react';
import { CheckCircle, Shield, TestTube2, Eye } from 'lucide-react';

interface FeatureRow {
  badge: string;
  badgeBg: string;
  badgeColor: string;
  title: string;
  description: string;
  benefits: string[];
  chips: string[];
  placeholderIcon: typeof Shield;
  placeholderLabel: string;
}

const sentinelRow: FeatureRow = {
  badge: 'SENTINEL AI',
  badgeBg: 'var(--accent-purple-soft)',
  badgeColor: 'var(--accent-purple)',
  title: 'Deep semantic reviews, not surface linting.',
  description:
    'Sentinel analyzes every commit with full codebase context, understanding architectural intent, security implications, and technical debt accumulation. It provides real-time feedback with suggestions that consider your team standards and historical patterns.',
  benefits: [
    'Catches architectural risks before code review',
    'Security vulnerability detection with explanations',
    'Performance impact analysis for every change',
    'Automated refactoring suggestions with test coverage',
  ],
  chips: ['AST Analysis', 'Pattern Recognition', 'Risk Scoring', 'Context Aware'],
  placeholderIcon: Shield,
  placeholderLabel: 'Sentinel Review Interface',
};

const fortressRow: FeatureRow = {
  badge: 'FORTRESS QA',
  badgeBg: 'var(--accent-blue-soft)',
  badgeColor: 'var(--accent-blue)',
  title: 'Autonomous test generation and healing.',
  description:
    'Fortress orchestrates comprehensive test suites through AWS Step Functions, automatically generating tests for new code paths, healing flaky tests, and maintaining coverage as your codebase evolves. Zero manual intervention required.',
  benefits: [
    'Auto-generated tests for every new code path',
    'Self-healing test suites that adapt to changes',
    'Parallel execution across isolated environments',
    'Intelligent coverage analysis and suggestions',
  ],
  chips: ['Step Functions', 'Zero-Touch TDD', 'Isolated Runs', 'Smart Retry'],
  placeholderIcon: TestTube2,
  placeholderLabel: 'Fortress Autonomous Test Loop',
};

/* Shared window chrome */
function WindowChrome({ label }: { label: string }) {
  return (
    <div className="border-b border-[--border-subtle] px-4 py-3.5 flex items-center gap-2 bg-[--bg-soft]">
      <div className="w-3 h-3 rounded-full bg-red-500" />
      <div className="w-3 h-3 rounded-full bg-yellow-500" />
      <div className="w-3 h-3 rounded-full bg-green-500" />
      <span className="ml-3 text-xs font-medium text-[--text-secondary]">{label}</span>
    </div>
  );
}

/* Shared feature content block */
function FeatureContent({ row }: { row: FeatureRow }) {
  return (
    <>
      <div
        className="inline-block px-3 py-1.5 rounded-full mb-5 text-[11px] font-bold tracking-wider"
        style={{ backgroundColor: row.badgeBg, color: row.badgeColor }}
      >
        {row.badge}
      </div>

      <h3 className="text-[--h3] font-semibold mb-5 text-[--text-primary] tracking-tight">{row.title}</h3>

      <p className="mb-8 text-[16px] leading-[1.7] text-[--text-secondary]">{row.description}</p>

      <div className="space-y-4 mb-8">
        {row.benefits.map((benefit, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="flex items-start gap-3"
          >
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: row.badgeColor }} strokeWidth={2} />
            <span className="text-[15px] text-[--text-primary]">{benefit}</span>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {row.chips.map((chip, i) => (
          <div
            key={i}
            className="px-3 py-1.5 rounded-[--radius-md] text-[12px] font-medium"
            style={{ backgroundColor: row.badgeBg, color: row.badgeColor }}
          >
            {chip}
          </div>
        ))}
      </div>
    </>
  );
}

export function ProductDeepDiveSection() {
  return (
    <section className="v-section-major bg-[--bg-primary]" aria-label="Product deep dive">
      <div className="v-container">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20 max-w-[760px] mx-auto"
        >
          <h2 className="mb-5 text-[--text-primary]">See Velocis in action</h2>
          <p className="text-[18px] leading-[1.6] text-[--text-secondary]">
            Every interaction with your codebase becomes visible, traceable, and actionable through
            our autonomous engineering platform.
          </p>
        </motion.div>

        {/* Row 1 — Sentinel (Image Left) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-32">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            whileHover={{ y: -3 }}
            className="rounded-[--radius-2xl] border-2 border-[--border-subtle] overflow-hidden shadow-2xl bg-white"
          >
            <WindowChrome label={sentinelRow.placeholderLabel} />
            <div className="aspect-[16/10] flex items-center justify-center relative bg-[#fafafa]">
              <div className="absolute inset-0 p-8">
                <div className="grid grid-cols-2 gap-4 h-full">
                  <div className="space-y-3">
                    <div className="h-8 rounded-[--radius-md] bg-[--accent-purple-soft]" />
                    <div className="h-20 rounded-[--radius-md] bg-gray-200" />
                    <div className="h-16 rounded-[--radius-md] bg-gray-200" />
                    <div className="h-24 rounded-[--radius-md] bg-gray-200" />
                  </div>
                  <div className="space-y-2">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="h-6 rounded bg-gray-200" />
                    ))}
                  </div>
                </div>
              </div>
              <div className="relative z-10 text-center px-8">
                <Shield className="w-16 h-16 mx-auto mb-4 text-[--accent-purple] opacity-30" strokeWidth={1.5} />
                <p className="text-sm font-medium text-[--text-primary] opacity-40">Product Screenshot Placeholder</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
          >
            <FeatureContent row={sentinelRow} />
          </motion.div>
        </div>

        {/* Row 2 — Fortress (Image Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-32">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className="lg:order-1"
          >
            <FeatureContent row={fortressRow} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            whileHover={{ y: -3 }}
            className="rounded-[--radius-2xl] border-2 border-[--border-subtle] overflow-hidden shadow-2xl bg-white lg:order-2"
          >
            <WindowChrome label={fortressRow.placeholderLabel} />
            <div className="aspect-[16/10] flex items-center justify-center relative bg-[#fafafa]">
              <div className="absolute inset-0 p-8">
                <div className="space-y-3">
                  <div className="h-10 rounded-[--radius-md] flex items-center px-4 gap-3 bg-[--accent-blue-soft]">
                    <div className="w-6 h-6 rounded-full bg-[--accent-blue]" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-16 rounded-[--radius-md] bg-gray-200" />
                    ))}
                  </div>
                  <div className="h-32 rounded-[--radius-md] bg-gray-200" />
                </div>
              </div>
              <div className="relative z-10 text-center px-8">
                <TestTube2 className="w-16 h-16 mx-auto mb-4 text-[--accent-blue] opacity-30" strokeWidth={1.5} />
                <p className="text-sm font-medium text-[--text-primary] opacity-40">Product Screenshot Placeholder</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Row 3 — Visual Cortex (Full Width) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-12"
        >
          <div className="inline-block px-3 py-1.5 rounded-full mb-5 text-[11px] font-bold tracking-wider bg-[--accent-green-soft] text-[--accent-green]">
            VISUAL CORTEX
          </div>
          <h3 className="text-[--h3] font-semibold mb-5 max-w-[700px] mx-auto text-[--text-primary] tracking-tight">
            Your codebase as a living, breathing 3D city.
          </h3>
          <p className="mb-12 text-[16px] leading-[1.7] max-w-[640px] mx-auto text-[--text-secondary]">
            Visual Cortex transforms your abstract architecture into a tangible spatial representation,
            making dependencies, complexity, and health instantly visible.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, delay: 0.2 }}
          whileHover={{ y: -4 }}
          className="rounded-[--radius-2xl] border-2 border-green-500/30 overflow-hidden shadow-2xl bg-[#0a0a0a]"
        >
          <div className="border-b border-white/10 px-4 py-3.5 flex items-center gap-2 bg-[#111]/80">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="ml-3 text-xs font-medium text-white/70">Visual Cortex 3D Codebase City</span>
          </div>

          <div className="aspect-[21/9] flex items-center justify-center relative bg-[#0f0f10]">
            <div className="absolute inset-0 p-12 overflow-hidden">
              <div className="grid grid-cols-6 gap-4 h-full">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="rounded-[--radius-md] opacity-20"
                    style={{
                      backgroundColor:
                        i % 3 === 0 ? 'var(--accent-green)' : i % 3 === 1 ? 'var(--accent-blue)' : 'var(--accent-purple)',
                      height: `${40 + (i % 4) * 15}%`,
                      alignSelf: 'flex-end',
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="relative z-10 text-center px-8">
              <Eye className="w-20 h-20 mx-auto mb-4 text-[--accent-green] opacity-40" strokeWidth={1.5} />
              <p className="text-sm font-medium text-white/50">3D Visualization Placeholder</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
