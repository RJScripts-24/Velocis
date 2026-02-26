"use client";

import { motion } from 'motion/react';
import { Github, Twitter, Linkedin, Youtube } from 'lucide-react';

const footerSections = [
  { title: 'Product', links: ['Features', 'Pricing', 'Security', 'Changelog', 'Roadmap'] },
  { title: 'Agents', links: ['Sentinel', 'Fortress', 'Visual Cortex', 'Integration'] },
  { title: 'Developers', links: ['Documentation', 'API Reference', 'SDKs', 'CLI Tools', 'GitHub App'] },
  { title: 'Resources', links: ['Blog', 'Case Studies', 'Support', 'Status', 'Community'] },
  { title: 'Company', links: ['About', 'Careers', 'Contact', 'Press Kit', 'Partners'] },
];

const socialLinks = [
  { icon: Github, label: 'GitHub' },
  { icon: Twitter, label: 'Twitter' },
  { icon: Linkedin, label: 'LinkedIn' },
  { icon: Youtube, label: 'YouTube' },
];

const bottomLinks = ['Terms of Service', 'Privacy Policy', 'Security', 'Status', 'Cookie Settings'];

export function Footer() {
  return (
    <footer className="py-16 bg-[--bg-footer]" aria-label="Site footer">
      <div className="v-container">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10 mb-14">
          {/* Logo column */}
          <motion.div
            className="col-span-2 md:col-span-1"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-white rounded-[--radius-md] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M10 2L18 7V13L10 18L2 13V7L10 2Z" stroke="#111" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M10 2V10" stroke="#111" strokeWidth="2" />
                  <path d="M2 7L10 10" stroke="#111" strokeWidth="2" />
                  <path d="M18 7L10 10" stroke="#111" strokeWidth="2" />
                </svg>
              </div>
              <span className="text-lg font-bold tracking-tight text-[--text-inverse]">Velocis</span>
            </div>
            <p className="text-sm leading-[1.6] mb-6 text-white/50">
              Autonomous AI engineering for modern teams. Built on serverless infrastructure.
            </p>

            {/* Social icons */}
            <div className="flex gap-3">
              {socialLinks.map((social, index) => (
                <motion.a
                  key={index}
                  href="#"
                  whileHover={{ y: -2 }}
                  className="w-9 h-9 rounded-[--radius-md] flex items-center justify-center bg-white/10 text-white/60 hover:text-white/90 transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="w-4 h-4" strokeWidth={2} />
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Footer link sections */}
          {footerSections.map((section, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
            >
              <h4 className="font-semibold mb-4 text-sm text-[--text-inverse]">{section.title}</h4>
              <ul className="space-y-2.5">
                {section.links.map((link, i) => (
                  <li key={i}>
                    <a href="#" className="text-[13px] text-white/60 hover:text-white/90 transition-colors block">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Bottom bar */}
        <motion.div
          className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <p className="text-xs text-white/50">© 2026 Velocis Technologies, Inc. All rights reserved.</p>
          <div className="flex flex-wrap gap-6">
            {bottomLinks.map((link, i) => (
              <a key={i} href="#" className="text-xs text-white/60 hover:text-white/90 transition-colors">
                {link}
              </a>
            ))}
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
