"use client";

import { motion } from 'motion/react';
import { CheckCircle, ArrowRight, Code, Shield, TestTube2, Eye } from 'lucide-react';

export function ProductDeepDiveSection() {
  return (
    <section className="py-32 px-6" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-[1200px] mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20 max-w-[760px] mx-auto"
        >
          <h2 
            className="mb-5 tracking-tight"
            style={{ 
              fontSize: '42px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em'
            }}
          >
            See Velocis in action
          </h2>
          <p 
            className="text-[18px] leading-[1.6]"
            style={{ color: 'var(--text-secondary)' }}
          >
            Every interaction with your codebase becomes visible, traceable, and actionable through 
            our autonomous engineering platform.
          </p>
        </motion.div>

        {/* Feature Row 1 - Sentinel (Image Left) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-32">
          {/* Left - Large Image Placeholder */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            whileHover={{ y: -3 }}
            className="rounded-[20px] border-2 overflow-hidden shadow-2xl"
            style={{ 
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'white'
            }}
          >
            {/* Fake window chrome */}
            <div 
              className="border-b px-4 py-3.5 flex items-center gap-2"
              style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-soft)' }}
            >
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="ml-3 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Sentinel Review Interface
              </span>
            </div>
            
            {/* Placeholder content */}
            <div 
              className="aspect-[16/10] flex items-center justify-center relative"
              style={{ backgroundColor: '#fafafa' }}
            >
              {/* Fake UI elements */}
              <div className="absolute inset-0 p-8">
                <div className="grid grid-cols-2 gap-4 h-full">
                  {/* Left panel */}
                  <div className="space-y-3">
                    <div className="h-8 rounded-lg" style={{ backgroundColor: 'var(--accent-purple-soft)' }} />
                    <div className="h-20 rounded-lg" style={{ backgroundColor: '#e5e7eb' }} />
                    <div className="h-16 rounded-lg" style={{ backgroundColor: '#e5e7eb' }} />
                    <div className="h-24 rounded-lg" style={{ backgroundColor: '#e5e7eb' }} />
                  </div>
                  {/* Right panel */}
                  <div className="space-y-2">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="h-6 rounded" style={{ backgroundColor: '#e5e7eb' }} />
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="relative z-10 text-center px-8">
                <Shield className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--accent-purple)', opacity: 0.3 }} strokeWidth={1.5} />
                <p className="text-sm font-medium opacity-40" style={{ color: 'var(--text-primary)' }}>
                  Product Screenshot Placeholder
                </p>
              </div>
            </div>
          </motion.div>

          {/* Right - Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
          >
            <div 
              className="inline-block px-3 py-1.5 rounded-full mb-5 text-[11px] font-bold tracking-wider"
              style={{ 
                backgroundColor: 'var(--accent-purple-soft)',
                color: 'var(--accent-purple)'
              }}
            >
              SENTINEL AI
            </div>

            <h3 
              className="mb-5 tracking-tight"
              style={{ 
                fontSize: '32px',
                fontWeight: 600,
                color: 'var(--text-primary)'
              }}
            >
              Deep semantic reviews, not surface linting.
            </h3>

            <p 
              className="mb-8 text-[16px] leading-[1.7]"
              style={{ color: 'var(--text-secondary)' }}
            >
              Sentinel analyzes every commit with full codebase context, understanding architectural 
              intent, security implications, and technical debt accumulation. It provides real-time 
              feedback with suggestions that consider your team standards and historical patterns.
            </p>

            {/* Benefit bullets */}
            <div className="space-y-4 mb-8">
              {[
                'Catches architectural risks before code review',
                'Security vulnerability detection with explanations',
                'Performance impact analysis for every change',
                'Automated refactoring suggestions with test coverage'
              ].map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <CheckCircle 
                    className="w-5 h-5 flex-shrink-0 mt-0.5" 
                    style={{ color: 'var(--accent-purple)' }}
                    strokeWidth={2}
                  />
                  <span className="text-[15px]" style={{ color: 'var(--text-primary)' }}>
                    {benefit}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Feature chips */}
            <div className="flex flex-wrap gap-2">
              {['AST Analysis', 'Pattern Recognition', 'Risk Scoring', 'Context Aware'].map((chip, index) => (
                <div
                  key={index}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium"
                  style={{ 
                    backgroundColor: 'var(--accent-purple-soft)',
                    color: 'var(--accent-purple)'
                  }}
                >
                  {chip}
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Feature Row 2 - Fortress (Image Right - Reversed) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-32">
          {/* Left - Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className="lg:order-1"
          >
            <div 
              className="inline-block px-3 py-1.5 rounded-full mb-5 text-[11px] font-bold tracking-wider"
              style={{ 
                backgroundColor: 'var(--accent-blue-soft)',
                color: 'var(--accent-blue)'
              }}
            >
              FORTRESS QA
            </div>

            <h3 
              className="mb-5 tracking-tight"
              style={{ 
                fontSize: '32px',
                fontWeight: 600,
                color: 'var(--text-primary)'
              }}
            >
              Autonomous test generation and healing.
            </h3>

            <p 
              className="mb-8 text-[16px] leading-[1.7]"
              style={{ color: 'var(--text-secondary)' }}
            >
              Fortress orchestrates comprehensive test suites through AWS Step Functions, automatically 
              generating tests for new code paths, healing flaky tests, and maintaining coverage as your 
              codebase evolves. Zero manual intervention required.
            </p>

            {/* Benefit bullets */}
            <div className="space-y-4 mb-8">
              {[
                'Auto-generated tests for every new code path',
                'Self-healing test suites that adapt to changes',
                'Parallel execution across isolated environments',
                'Intelligent coverage analysis and suggestions'
              ].map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <CheckCircle 
                    className="w-5 h-5 flex-shrink-0 mt-0.5" 
                    style={{ color: 'var(--accent-blue)' }}
                    strokeWidth={2}
                  />
                  <span className="text-[15px]" style={{ color: 'var(--text-primary)' }}>
                    {benefit}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Feature chips */}
            <div className="flex flex-wrap gap-2">
              {['Step Functions', 'Zero-Touch TDD', 'Isolated Runs', 'Smart Retry'].map((chip, index) => (
                <div
                  key={index}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium"
                  style={{ 
                    backgroundColor: 'var(--accent-blue-soft)',
                    color: 'var(--accent-blue)'
                  }}
                >
                  {chip}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right - Large Image Placeholder */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            whileHover={{ y: -3 }}
            className="rounded-[20px] border-2 overflow-hidden shadow-2xl lg:order-2"
            style={{ 
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'white'
            }}
          >
            {/* Fake window chrome */}
            <div 
              className="border-b px-4 py-3.5 flex items-center gap-2"
              style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-soft)' }}
            >
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="ml-3 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Fortress Autonomous Test Loop
              </span>
            </div>
            
            {/* Placeholder content */}
            <div 
              className="aspect-[16/10] flex items-center justify-center relative"
              style={{ backgroundColor: '#fafafa' }}
            >
              {/* Fake UI elements */}
              <div className="absolute inset-0 p-8">
                <div className="space-y-3">
                  <div className="h-10 rounded-lg flex items-center px-4 gap-3" style={{ backgroundColor: 'var(--accent-blue-soft)' }}>
                    <div className="w-6 h-6 rounded-full" style={{ backgroundColor: 'var(--accent-blue)' }} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-16 rounded-lg" style={{ backgroundColor: '#e5e7eb' }} />
                    ))}
                  </div>
                  <div className="h-32 rounded-lg" style={{ backgroundColor: '#e5e7eb' }} />
                </div>
              </div>
              
              <div className="relative z-10 text-center px-8">
                <TestTube2 className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--accent-blue)', opacity: 0.3 }} strokeWidth={1.5} />
                <p className="text-sm font-medium opacity-40" style={{ color: 'var(--text-primary)' }}>
                  Product Screenshot Placeholder
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Feature Row 3 - Visual Cortex (Full Width Panoramic) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-12"
        >
          <div 
            className="inline-block px-3 py-1.5 rounded-full mb-5 text-[11px] font-bold tracking-wider"
            style={{ 
              backgroundColor: 'var(--accent-green-soft)',
              color: 'var(--accent-green)'
            }}
          >
            VISUAL CORTEX
          </div>

          <h3 
            className="mb-5 tracking-tight max-w-[700px] mx-auto"
            style={{ 
              fontSize: '32px',
              fontWeight: 600,
              color: 'var(--text-primary)'
            }}
          >
            Your codebase as a living, breathing 3D city.
          </h3>

          <p 
            className="mb-12 text-[16px] leading-[1.7] max-w-[640px] mx-auto"
            style={{ color: 'var(--text-secondary)' }}
          >
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
          className="rounded-[22px] border-2 overflow-hidden shadow-2xl"
          style={{ 
            borderColor: 'rgba(34, 197, 94, 0.3)',
            backgroundColor: '#0a0a0a'
          }}
        >
          {/* Fake window chrome */}
          <div 
            className="border-b px-4 py-3.5 flex items-center gap-2"
            style={{ borderColor: 'rgba(255, 255, 255, 0.1)', backgroundColor: 'rgba(17, 17, 17, 0.8)' }}
          >
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="ml-3 text-xs font-medium" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Visual Cortex 3D Codebase City
            </span>
          </div>
          
          {/* Wide panoramic placeholder */}
          <div 
            className="aspect-[21/9] flex items-center justify-center relative"
            style={{ backgroundColor: '#0f0f10' }}
          >
            {/* Fake 3D elements */}
            <div className="absolute inset-0 p-12 overflow-hidden">
              <div className="grid grid-cols-6 gap-4 h-full">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="rounded-lg opacity-20"
                    style={{ 
                      backgroundColor: i % 3 === 0 ? 'var(--accent-green)' : i % 3 === 1 ? 'var(--accent-blue)' : 'var(--accent-purple)',
                      height: `${40 + (i % 4) * 15}%`,
                      alignSelf: 'flex-end'
                    }}
                  />
                ))}
              </div>
            </div>
            
            <div className="relative z-10 text-center px-8">
              <Eye className="w-20 h-20 mx-auto mb-4" style={{ color: 'var(--accent-green)', opacity: 0.4 }} strokeWidth={1.5} />
              <p className="text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                3D Visualization Placeholder
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
