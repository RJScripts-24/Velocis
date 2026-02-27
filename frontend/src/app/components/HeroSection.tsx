"use client";

import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';
import { Github, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router';
import { PrimaryButton } from './shared/PrimaryButton';

/* ─── Sub-components ─── */

interface EdgeSlabProps {
  color: string;
  className?: string;
  yOffset?: number;
  duration?: number;
}

function EdgeSlab({ color, className = "", yOffset = 0, duration = 9 }: EdgeSlabProps) {
  return (
    <motion.div
      className={`absolute ${className} pointer-events-none`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, y: [0, -yOffset, 0] }}
      transition={{
        opacity: { duration: 0.8, delay: 0.3 },
        y: { duration, repeat: Infinity, ease: "easeInOut", delay: 0.3 },
      }}
    >
      <svg width="200" height="220" viewBox="0 0 200 220" fill="none" aria-hidden="true">
        <ellipse cx="100" cy="205" rx="70" ry="10" fill="#000" opacity="0.08" />
        <path d="M100 20 L180 65 L100 110 L20 65 Z" fill={color} stroke="#111" strokeWidth="3" />
        <path d="M20 65 L20 145 L100 190 L100 110 Z" fill={color} style={{ filter: 'brightness(0.85)' }} stroke="#111" strokeWidth="3" />
        <path d="M100 110 L100 190 L180 145 L180 65 Z" fill={color} style={{ filter: 'brightness(0.7)' }} stroke="#111" strokeWidth="3" />
      </svg>
    </motion.div>
  );
}

interface IsometricPlatformProps {
  color: string;
  delay?: number;
  duration?: number;
  className?: string;
  yOffset?: number;
  label?: string;
  smoothMouseX: ReturnType<typeof useSpring>;
  smoothMouseY: ReturnType<typeof useSpring>;
}

function IsometricPlatform({
  color,
  delay = 0,
  duration = 7,
  className = "",
  yOffset = 12,
  label = "",
  smoothMouseX,
  smoothMouseY,
}: IsometricPlatformProps) {
  return (
    <motion.div
      className={`absolute ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: [0, -yOffset, 0] }}
      transition={{
        opacity: { duration: 0.8, delay: 0.6 + delay },
        y: { duration, repeat: Infinity, ease: "easeInOut", delay: 0.6 + delay },
      }}
      style={{ x: smoothMouseX, y: smoothMouseY }}
    >
      <svg width="140" height="160" viewBox="0 0 140 160" fill="none" aria-hidden="true">
        <motion.ellipse cx="70" cy="150" rx="50" ry="8" fill="#000" animate={{ opacity: [0.08, 0.12, 0.08] }} transition={{ duration: 5, repeat: Infinity }} />
        <path d="M70 20 L130 50 L70 80 L10 50 Z" fill={color} stroke="#111" strokeWidth="2.5" />
        <path d="M10 50 L10 110 L70 140 L70 80 Z" fill={color} style={{ filter: 'brightness(0.85)' }} stroke="#111" strokeWidth="2.5" />
        <path d="M70 80 L70 140 L130 110 L130 50 Z" fill={color} style={{ filter: 'brightness(0.7)' }} stroke="#111" strokeWidth="2.5" />
      </svg>

      {label && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ duration: 1, delay: 1 + delay }}
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap"
        >
          <span className="text-[10px] font-semibold tracking-wide text-[--text-primary]">
            {label}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ─── Stagger variants ─── */
const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

/* ─── Trust data ─── */
const trustBadges = [
  { text: 'GitHub native' },
  { text: 'Serverless first' },
  { text: 'Zero idle cost' },
  { text: 'Enterprise ready' },
];

const clientLogos = [
  { name: 'GitHub', opacity: 0.6 },
  { name: 'AWS', opacity: 0.5 },
  { name: 'Bedrock', opacity: 0.55 },
  { name: 'Next.js', opacity: 0.6 },
  { name: 'Terraform', opacity: 0.5 },
];

/* ─── Main Component ─── */

export function HeroSection() {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothMouseX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const smoothMouseY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  const handleConnect = () => navigate('/onboarding');

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
        const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
        mouseX.set(x * 6);
        mouseY.set(y * 6);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <section
      ref={heroRef}
      className="relative pt-[140px] pb-24 overflow-hidden"
      aria-label="Hero"
    >
      {/* Code context layer */}
      <div
        className="absolute left-0 top-[120px] bottom-0 w-[40%] pointer-events-none overflow-hidden hidden lg:block"
        style={{ opacity: 0.06, filter: 'blur(1px)' }}
        aria-hidden="true"
      >
        <pre className="v-code text-[11px] leading-relaxed text-[--text-primary]">
          {`function analyzeCommit(diff) {
  const analysis = await 
    sentinel.review(diff);
  
  if (analysis.risk > 0.7) {
    await fortress.runTests();
    visualCortex.update();
  }
  
  return {
    confidence: analysis.score,
    blockers: analysis.issues
  };
}`}
        </pre>
      </div>

      {/* Floating isometric decorations */}
      <IsometricPlatform color="var(--accent-purple-soft)" className="left-[-40px] top-[100px] hidden lg:block" delay={0} duration={8.5} yOffset={14} label="SENTINEL" smoothMouseX={smoothMouseX} smoothMouseY={smoothMouseY} />
      <IsometricPlatform color="var(--accent-blue-soft)" className="right-[-30px] top-[140px] hidden lg:block" delay={1.5} duration={7.2} yOffset={10} label="FORTRESS" smoothMouseX={smoothMouseX} smoothMouseY={smoothMouseY} />
      <IsometricPlatform color="var(--accent-green-soft)" className="left-[70px] top-[360px] hidden lg:block" delay={0.8} duration={9.3} yOffset={12} label="CORTEX" smoothMouseX={smoothMouseX} smoothMouseY={smoothMouseY} />

      {/* Large edge decorative slabs */}
      <EdgeSlab color="var(--accent-green-soft)" className="left-[-120px] top-[-40px] hidden xl:block" yOffset={8} duration={10} />
      <EdgeSlab color="var(--accent-blue-soft)" className="right-[-120px] top-[-60px] hidden xl:block" yOffset={11} duration={8.5} />
      <EdgeSlab color="var(--accent-purple-soft)" className="left-[-130px] bottom-[-80px] hidden xl:block" yOffset={14} duration={9.2} />
      <EdgeSlab color="var(--accent-green-soft)" className="right-[-110px] bottom-[-100px] hidden xl:block" yOffset={10} duration={11} />

      {/* Content */}
      <div className="v-container relative z-10">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="text-center max-w-[900px] mx-auto"
        >
          {/* Eyebrow badge */}
          <motion.div variants={fadeUp} className="mb-7">
            <span className="inline-block px-4 py-2 rounded-full text-[13px] font-semibold tracking-wide bg-[--accent-green-soft] text-[--accent-green]">
              AUTONOMOUS AI ENGINEERING LAYER
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            className="mb-7 text-[--text-primary]"
          >
            Turn your codebase into a self-improving system.
          </motion.h1>

          {/* Subtext */}
          <motion.p
            variants={fadeUp}
            className="mb-10 text-lg leading-[1.6] max-w-[720px] mx-auto text-[--text-secondary]"
          >
            Velocis operates as an always-on senior engineer that autonomously reviews every commit,
            orchestrates comprehensive QA loops, and provides real-time architecture intelligence—all
            with zero idle overhead. Built for engineering teams that ship with confidence.
          </motion.p>

          {/* CTA */}
          <motion.div variants={fadeUp}>
            <motion.div
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="inline-block"
            >
              <PrimaryButton
                size="lg"
                icon={<Github className="w-5 h-5" />}
                onClick={handleConnect}
                className="shadow-lg hover:shadow-2xl"
              >
                Connect with GitHub
              </PrimaryButton>
            </motion.div>

            {/* Trust text */}
            <p className="text-sm mt-4 mb-6 text-[--text-secondary]">
              Works with private repositories • Setup in under 2 minutes
            </p>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {trustBadges.map((badge, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.75 + index * 0.08 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[--border-subtle] bg-white"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[--text-primary] opacity-50" strokeWidth={2} />
                  <span className="text-[11px] font-medium text-[--text-primary] opacity-60">
                    {badge.text}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Client logo strip */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.9 }}
          className="mt-20 pt-12 border-t border-[--border-subtle]"
        >
          <p className="text-center text-xs font-medium tracking-wider uppercase mb-8 text-[--text-secondary]">
            Trusted by teams using
          </p>
          <div className="flex flex-wrap items-center justify-center gap-10 md:gap-14">
            {clientLogos.map((logo, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: logo.opacity, y: 0 }}
                whileHover={{ opacity: 0.9 }}
                transition={{ duration: 0.4, delay: 1 + index * 0.08 }}
                className="font-semibold text-xl text-[--text-primary]"
              >
                {logo.name}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}