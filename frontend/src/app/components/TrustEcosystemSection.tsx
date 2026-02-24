"use client";

import { motion } from 'motion/react';

const ecosystemLogos = [
  { name: 'GitHub', category: 'Version Control' },
  { name: 'AWS', category: 'Cloud Infrastructure' },
  { name: 'Bedrock', category: 'AI Foundation' },
  { name: 'Terraform', category: 'Infrastructure as Code' },
  { name: 'Next.js', category: 'Web Framework' },
  { name: 'DynamoDB', category: 'Database' },
  { name: 'Lambda', category: 'Serverless Compute' },
  { name: 'Step Functions', category: 'Orchestration' },
];

export function TrustEcosystemSection() {
  return (
    <section className="v-section-major bg-[--bg-soft]" aria-label="Ecosystem integrations">
      <div className="v-container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <h2 className="mb-5 text-[--text-primary]">
            Built for modern cloud-native teams
          </h2>
          <p className="text-[17px] leading-[1.6] max-w-[640px] mx-auto text-[--text-secondary]">
            Velocis integrates seamlessly with the tools and infrastructure you already use.
          </p>
        </motion.div>

        {/* Logo grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {ecosystemLogos.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.06 }}
              className="rounded-[--radius-xl] border border-[--border-subtle] p-6 flex flex-col items-center justify-center text-center bg-white opacity-80 v-card-hover min-h-[140px]"
            >
              <div className="font-bold text-xl mb-2 text-[--text-primary] opacity-60">{item.name}</div>
              <div className="text-[11px] font-medium text-[--text-primary] opacity-40">{item.category}</div>
            </motion.div>
          ))}
        </div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center mt-10 text-sm text-[--text-secondary]"
        >
          Works with your existing GitHub workflow—no code changes or migrations required.
        </motion.p>
      </div>
    </section>
  );
}