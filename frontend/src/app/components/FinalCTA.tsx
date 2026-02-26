"use client";

import { motion } from 'motion/react';
import { Github, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router';
import { PrimaryButton } from './shared/PrimaryButton';

const reassuranceItems = [
  'No code changes required',
  'Works with private repos',
  'Free to start',
];

export function FinalCTA() {
  const navigate = useNavigate();
  const handleConnect = () => navigate('/onboarding');

  return (
    <section className="py-40 relative overflow-hidden" aria-label="Get started">
      {/* Background gradient */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, var(--accent-green-soft) 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      <div className="v-container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-[760px] mx-auto"
        >
          {/* Eyebrow */}
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block px-4 py-2 rounded-full text-[12px] font-bold tracking-wider bg-[--accent-green-soft] text-[--accent-green]">
              START IN MINUTES
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h2
            className="mb-6 text-[--text-primary]"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Bring an autonomous senior engineer into every repository.
          </motion.h2>

          {/* Subtext */}
          <motion.p
            className="mb-10 text-lg leading-[1.6] text-[--text-secondary]"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Join engineering teams that ship faster with confidence, backed by continuous
            autonomous code review, testing, and architecture intelligence.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <motion.div
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-block"
            >
              <PrimaryButton
                size="lg"
                icon={<Github className="w-6 h-6" />}
                onClick={handleConnect}
                className="shadow-lg hover:shadow-2xl text-xl !px-10 !py-5"
              >
                Connect with GitHub
              </PrimaryButton>
            </motion.div>

            <p className="text-sm mt-3 mb-8 text-[--text-secondary]">
              Set up in under 2 minutes • No credit card required
            </p>
          </motion.div>

          {/* Reassurance items */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-6"
          >
            {reassuranceItems.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[--accent-green]" strokeWidth={2.5} />
                <span className="text-sm font-medium text-[--text-primary]">{item}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}