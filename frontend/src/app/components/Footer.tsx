"use client";

import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { Github, Twitter, Linkedin, Youtube } from 'lucide-react';

const footerSections = [
  { title: 'Product', links: [{ label: 'Features', href: '#' }, { label: 'Pricing', href: '#' }, { label: 'Security', href: '/security' }, { label: 'Changelog', href: '#' }, { label: 'Roadmap', href: '#' }] },
  { title: 'Agents', links: [{ label: 'Sentinel', href: '#' }, { label: 'Fortress', href: '#' }, { label: 'Visual Cortex', href: '#' }, { label: 'Integration', href: '#' }] },
  { title: 'Developers', links: [{ label: 'Documentation', href: '#' }, { label: 'API Reference', href: '#' }, { label: 'SDKs', href: '#' }, { label: 'CLI Tools', href: '#' }, { label: 'GitHub App', href: '#' }] },
  { title: 'Resources', links: [{ label: 'Blog', href: '/blog' }, { label: 'Case Studies', href: '#' }, { label: 'Support', href: '#' }, { label: 'Status', href: '#' }, { label: 'Community', href: '#' }] },
  { title: 'Company', links: [{ label: 'About', href: '/about' }, { label: 'Careers', href: '/careers' }, { label: 'Contact', href: '/contact' }, { label: 'Press Kit', href: '#' }, { label: 'Partners', href: '#' }] },
];

const socialLinks = [
  { icon: Github, label: 'GitHub' },
  { icon: Twitter, label: 'Twitter' },
  { icon: Linkedin, label: 'LinkedIn' },
  { icon: Youtube, label: 'YouTube' },
];

const bottomLinks = [{ label: 'Terms of Service', href: '#' }, { label: 'Privacy Policy', href: '#' }, { label: 'Security', href: '/security' }, { label: 'Status', href: '#' }, { label: 'Cookie Settings', href: '#' }];

export function Footer() {
  const navigate = useNavigate();

  const handleLinkClick = (href: string) => {
    if (href.startsWith('/')) {
      window.open(href, '_blank', 'noopener,noreferrer');
    } else if (href !== '#') {
      window.open(href, '_blank');
    }
  };
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
                    <button
                      onClick={() => handleLinkClick(link.href)}
                      className="text-[13px] text-white/60 hover:text-white/90 transition-colors block text-left"
                    >
                      {link.label}
                    </button>
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
              <button
                key={i}
                onClick={() => handleLinkClick(link.href)}
                className="text-xs text-white/60 hover:text-white/90 transition-colors"
              >
                {link.label}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
