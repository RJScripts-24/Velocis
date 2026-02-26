"use client";

import { motion } from 'motion/react';

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  bgColor: string;
  avatar: string;
}

const testimonials: Testimonial[] = [
  {
    quote: "Velocis caught a critical race condition in our payment flow that three senior engineers missed. The contextual analysis is genuinely impressive—it understands our business logic, not just syntax.",
    name: "Marcus Chen",
    role: "Staff Engineer, Fintech Platform",
    bgColor: 'var(--accent-purple-soft)',
    avatar: 'MC',
  },
  {
    quote: "We reduced PR review time by 60% while actually improving code quality. Sentinel's automated refactoring suggestions are production-ready. It's like having a senior architect on every commit.",
    name: "Sarah Williams",
    role: "Engineering Manager, Cloud Infrastructure",
    bgColor: 'var(--accent-blue-soft)',
    avatar: 'SW',
  },
  {
    quote: "The Visual Cortex 3D view helped us identify a cascading dependency issue that was slowing our entire deployment pipeline. What would have taken days to diagnose took 15 minutes.",
    name: "David Park",
    role: "Principal Engineer, SaaS Platform",
    bgColor: 'var(--accent-green-soft)',
    avatar: 'DP',
  },
];

export function TestimonialsSection() {
  return (
    <section className="v-section-major bg-[--bg-soft]" aria-label="Testimonials">
      <div className="v-container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="mb-5 text-[--text-primary]">
            Trusted by teams building modern infrastructure
          </h2>
          <p className="text-[17px] leading-[1.6] max-w-[640px] mx-auto text-[--text-secondary]">
            Engineering teams at fast-moving companies rely on Velocis to maintain quality at scale.
          </p>
        </motion.div>

        {/* Testimonial Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.blockquote
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: index * 0.12 }}
              className="rounded-[--radius-2xl] p-7 border border-[--border-subtle] bg-white v-card-hover"
            >
              <p className="mb-6 text-[15px] leading-[1.7] italic text-[--text-primary]">
                "{testimonial.quote}"
              </p>

              <footer className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: testimonial.bgColor }}
                >
                  <span className="font-bold text-sm text-[--text-primary]">{testimonial.avatar}</span>
                </div>
                <div>
                  <cite className="not-italic font-semibold text-[14px] mb-0.5 block text-[--text-primary]">
                    {testimonial.name}
                  </cite>
                  <p className="text-[13px] text-[--text-secondary]">{testimonial.role}</p>
                </div>
              </footer>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
