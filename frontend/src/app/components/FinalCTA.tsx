"use client";

import { motion } from 'motion/react';
import { Github, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router';

export function FinalCTA() {
  const navigate = useNavigate();
  
  const reassuranceItems = [
    'No code changes required',
    'Works with private repos',
    'Free to start'
  ];

  const handleConnect = () => {
    navigate('/onboarding');
  };

  return (
    <section className="py-40 px-6 relative overflow-hidden">
      {/* Very subtle background gradient fade */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, var(--accent-green-soft) 0%, transparent 70%)'
        }}
      />
      
      <div className="max-w-[1200px] mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-[760px] mx-auto"
        >
          {/* Green eyebrow */}
          <motion.div 
            className="mb-6"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span 
              className="inline-block px-4 py-2 rounded-full text-[12px] font-bold tracking-wider"
              style={{ 
                backgroundColor: 'var(--accent-green-soft)',
                color: 'var(--accent-green)'
              }}
            >
              START IN MINUTES
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h2 
            className="mb-6 tracking-tight leading-[1.15]"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{ 
              fontSize: '42px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em'
            }}
          >
            Bring an autonomous senior engineer into every repository.
          </motion.h2>

          {/* Subtext */}
          <motion.p 
            className="mb-10 text-lg leading-[1.6]"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{ color: 'var(--text-secondary)' }}
          >
            Join engineering teams that ship faster with confidence, backed by continuous 
            autonomous code review, testing, and architecture intelligence.
          </motion.p>

          {/* Primary CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <motion.button
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-10 py-5 rounded-[14px] flex items-center gap-3 mx-auto transition-shadow hover:shadow-2xl mb-3"
              style={{ 
                backgroundColor: 'var(--cta-primary)',
                color: 'var(--cta-text)'
              }}
              onClick={handleConnect}
            >
              <Github className="w-6 h-6" />
              <span className="font-bold text-xl">Connect with GitHub</span>
            </motion.button>

            {/* Supporting line */}
            <p 
              className="text-sm mb-8"
              style={{ color: 'var(--text-secondary)' }}
            >
              Set up in under 2 minutes • No credit card required
            </p>
          </motion.div>

          {/* Reassurance row with checkmarks */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-6"
          >
            {reassuranceItems.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.5 + index * 0.08 }}
                className="flex items-center gap-2"
              >
                <CheckCircle 
                  className="w-4 h-4" 
                  style={{ color: 'var(--accent-green)' }}
                  strokeWidth={2.5}
                />
                <span 
                  className="text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {item}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}