"use client";

import { motion } from 'motion/react';
import { Github, Twitter, Linkedin, Youtube } from 'lucide-react';

export function Footer() {
  const footerSections = [
    {
      title: 'Product',
      links: ['Features', 'Pricing', 'Security', 'Changelog', 'Roadmap']
    },
    {
      title: 'Agents',
      links: ['Sentinel', 'Fortress', 'Visual Cortex', 'Integration']
    },
    {
      title: 'Developers',
      links: ['Documentation', 'API Reference', 'SDKs', 'CLI Tools', 'GitHub App']
    },
    {
      title: 'Resources',
      links: ['Blog', 'Case Studies', 'Support', 'Status', 'Community']
    },
    {
      title: 'Company',
      links: ['About', 'Careers', 'Contact', 'Press Kit', 'Partners']
    }
  ];

  const socialLinks = [
    { icon: Github, label: 'GitHub' },
    { icon: Twitter, label: 'Twitter' },
    { icon: Linkedin, label: 'LinkedIn' },
    { icon: Youtube, label: 'YouTube' }
  ];

  return (
    <footer 
      className="py-16 px-6"
      style={{ backgroundColor: 'var(--bg-footer)' }}
    >
      <div className="max-w-[1200px] mx-auto">
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
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 2L18 7V13L10 18L2 13V7L10 2Z" stroke="#111111" strokeWidth="2" strokeLinejoin="round"/>
                  <path d="M10 2V10" stroke="#111111" strokeWidth="2"/>
                  <path d="M2 7L10 10" stroke="#111111" strokeWidth="2"/>
                  <path d="M18 7L10 10" stroke="#111111" strokeWidth="2"/>
                </svg>
              </div>
              <span 
                className="text-lg font-bold tracking-tight"
                style={{ color: 'var(--text-inverse)' }}
              >
                Velocis
              </span>
            </div>
            <p 
              className="text-sm leading-[1.6] mb-6"
              style={{ color: 'rgba(255, 255, 255, 0.5)' }}
            >
              Autonomous AI engineering for modern teams. Built on serverless infrastructure.
            </p>

            {/* Social icons */}
            <div className="flex gap-3">
              {socialLinks.map((social, index) => (
                <motion.a
                  key={index}
                  href="#"
                  whileHover={{ y: -2 }}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: 'rgba(255, 255, 255, 0.6)'
                  }}
                  aria-label={social.label}
                >
                  <social.icon className="w-4 h-4" strokeWidth={2} />
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Footer links */}
          {footerSections.map((section, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
            >
              <h4 
                className="font-semibold mb-4 text-sm"
                style={{ color: 'var(--text-inverse)' }}
              >
                {section.title}
              </h4>
              <ul className="space-y-2.5">
                {section.links.map((link, i) => (
                  <li key={i}>
                    <a 
                      href="#"
                      className="text-[13px] hover:opacity-100 transition-opacity block"
                      style={{ color: 'rgba(255, 255, 255, 0.6)' }}
                    >
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
          className="pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4"
          style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <p 
            className="text-xs"
            style={{ color: 'rgba(255, 255, 255, 0.5)' }}
          >
            © 2026 Velocis Technologies, Inc. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-6">
            <a 
              href="#"
              className="text-xs hover:opacity-100 transition-opacity"
              style={{ color: 'rgba(255, 255, 255, 0.6)' }}
            >
              Terms of Service
            </a>
            <a 
              href="#"
              className="text-xs hover:opacity-100 transition-opacity"
              style={{ color: 'rgba(255, 255, 255, 0.6)' }}
            >
              Privacy Policy
            </a>
            <a 
              href="#"
              className="text-xs hover:opacity-100 transition-opacity"
              style={{ color: 'rgba(255, 255, 255, 0.6)' }}
            >
              Security
            </a>
            <a 
              href="#"
              className="text-xs hover:opacity-100 transition-opacity"
              style={{ color: 'rgba(255, 255, 255, 0.6)' }}
            >
              Status
            </a>
            <a 
              href="#"
              className="text-xs hover:opacity-100 transition-opacity"
              style={{ color: 'rgba(255, 255, 255, 0.6)' }}
            >
              Cookie Settings
            </a>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
