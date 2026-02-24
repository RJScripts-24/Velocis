"use client";

import { motion } from 'motion/react';

export function TrustEcosystemSection() {
  const ecosystemLogos = [
    { name: 'GitHub', category: 'Version Control' },
    { name: 'AWS', category: 'Cloud Infrastructure' },
    { name: 'Bedrock', category: 'AI Foundation' },
    { name: 'Terraform', category: 'Infrastructure as Code' },
    { name: 'Next.js', category: 'Web Framework' },
    { name: 'DynamoDB', category: 'Database' },
    { name: 'Lambda', category: 'Serverless Compute' },
    { name: 'Step Functions', category: 'Orchestration' }
  ];

  return (
    <section className="py-24 px-6" style={{ backgroundColor: 'var(--bg-soft)' }}>
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <h2 
            className="mb-5 tracking-tight"
            style={{ 
              fontSize: '36px',
              fontWeight: 600,
              color: 'var(--text-primary)'
            }}
          >
            Built for modern cloud-native teams
          </h2>
          <p 
            className="text-[17px] leading-[1.6] max-w-[640px] mx-auto"
            style={{ color: 'var(--text-secondary)' }}
          >
            Velocis integrates seamlessly with the tools and infrastructure you already use.
          </p>
        </motion.div>

        {/* Logo grid - two rows */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {ecosystemLogos.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.06 }}
              whileHover={{ y: -4, borderColor: 'var(--text-primary)', opacity: 1 }}
              className="rounded-[14px] border p-6 flex flex-col items-center justify-center text-center transition-all bg-white opacity-80"
              style={{ 
                borderColor: 'var(--border-subtle)',
                minHeight: '140px'
              }}
            >
              <div 
                className="font-bold text-xl mb-2 opacity-60"
                style={{ color: 'var(--text-primary)' }}
              >
                {item.name}
              </div>
              <div 
                className="text-[11px] font-medium opacity-40"
                style={{ color: 'var(--text-primary)' }}
              >
                {item.category}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center mt-10 text-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          Works with your existing GitHub workflow—no code changes or migrations required.
        </motion.p>
      </div>
    </section>
  );
}