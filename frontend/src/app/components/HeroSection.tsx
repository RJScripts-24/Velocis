"use client";

import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';
import { Github, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router';

export function HeroSection() {
  const navigate = useNavigate();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLDivElement>(null);

  // Smooth mouse tracking for parallax
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothMouseX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const smoothMouseY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  const handleConnect = () => {
    navigate('/onboarding');
  };

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

  // Large edge decorative slabs (Prismic style)
  const EdgeSlab = ({ 
    color, 
    className = "",
    yOffset = 10,
    duration = 9
  }: { 
    color: string; 
    className?: string;
    yOffset?: number;
    duration?: number;
  }) => (
    <motion.div
      className={`absolute ${className} pointer-events-none`}
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: 1, 
        y: [0, -yOffset, 0]
      }}
      transition={{
        opacity: { duration: 0.8, delay: 0.3 },
        y: {
          duration,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.3
        }
      }}
    >
      <svg width="200" height="220" viewBox="0 0 200 220" fill="none">
        {/* Shadow ellipse */}
        <ellipse
          cx="100"
          cy="205"
          rx="70"
          ry="10"
          fill="#000000"
          opacity="0.08"
        />
        
        {/* Top face */}
        <path
          d="M100 20 L180 65 L100 110 L20 65 Z"
          fill={color}
          stroke="#111111"
          strokeWidth="3"
        />
        
        {/* Left face */}
        <path
          d="M20 65 L20 145 L100 190 L100 110 Z"
          fill={color}
          style={{ filter: 'brightness(0.85)' }}
          stroke="#111111"
          strokeWidth="3"
        />
        
        {/* Right face */}
        <path
          d="M100 110 L100 190 L180 145 L180 65 Z"
          fill={color}
          style={{ filter: 'brightness(0.7)' }}
          stroke="#111111"
          strokeWidth="3"
        />
      </svg>
    </motion.div>
  );

  // Isometric platform components with semantic labels
  const IsometricPlatform = ({ 
    color, 
    delay = 0, 
    duration = 7, 
    className = "",
    yOffset = 12,
    label = ""
  }: { 
    color: string; 
    delay?: number; 
    duration?: number; 
    className?: string;
    yOffset?: number;
    label?: string;
  }) => (
    <motion.div
      className={`absolute ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: 1, 
        y: [0, -yOffset, 0]
      }}
      transition={{
        opacity: { duration: 0.8, delay: 0.6 + delay },
        y: {
          duration,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.6 + delay
        }
      }}
      style={{
        x: smoothMouseX,
        y: smoothMouseY
      }}
    >
      <svg width="140" height="160" viewBox="0 0 140 160" fill="none">
        {/* Shadow */}
        <motion.ellipse
          cx="70"
          cy="150"
          rx="50"
          ry="8"
          fill="#000000"
          animate={{ opacity: [0.08, 0.12, 0.08] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
        
        {/* Top face */}
        <path
          d="M70 20 L130 50 L70 80 L10 50 Z"
          fill={color}
          stroke="#111111"
          strokeWidth="2.5"
        />
        
        {/* Left face */}
        <path
          d="M10 50 L10 110 L70 140 L70 80 Z"
          fill={color}
          style={{ filter: 'brightness(0.85)' }}
          stroke="#111111"
          strokeWidth="2.5"
        />
        
        {/* Right face */}
        <path
          d="M70 80 L70 140 L130 110 L130 50 Z"
          fill={color}
          style={{ filter: 'brightness(0.7)' }}
          stroke="#111111"
          strokeWidth="2.5"
        />
      </svg>
      
      {/* Semantic label */}
      {label && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ duration: 1, delay: 1 + delay }}
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap"
        >
          <span 
            className="text-[10px] font-semibold tracking-wide"
            style={{ color: 'var(--text-primary)' }}
          >
            {label}
          </span>
        </motion.div>
      )}
    </motion.div>
  );

  const trustBadges = [
    { icon: Sparkles, text: 'GitHub native' },
    { icon: Sparkles, text: 'Serverless first' },
    { icon: Sparkles, text: 'Zero idle cost' },
    { icon: Sparkles, text: 'Enterprise ready' }
  ];

  const clientLogos = [
    { name: 'GitHub', opacity: 0.6 },
    { name: 'AWS', opacity: 0.5 },
    { name: 'Bedrock', opacity: 0.55 },
    { name: 'Next.js', opacity: 0.6 },
    { name: 'Terraform', opacity: 0.5 }
  ];

  return (
    <section ref={heroRef} className="relative pt-[140px] pb-20 px-6 overflow-hidden">
      {/* Subtle code context layer - left side only */}
      <div 
        className="absolute left-0 top-[120px] bottom-0 w-[40%] pointer-events-none overflow-hidden hidden lg:block"
        style={{ 
          opacity: 0.06,
          filter: 'blur(1px)'
        }}
      >
        <pre className="font-mono text-[11px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>
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

      {/* Floating Isometric Objects with semantic meaning */}
      <IsometricPlatform 
        color="var(--accent-purple-soft)" 
        className="left-[-40px] top-[100px] hidden lg:block"
        delay={0}
        duration={8.5}
        yOffset={14}
        label="SENTINEL"
      />
      <IsometricPlatform 
        color="var(--accent-blue-soft)" 
        className="right-[-30px] top-[140px] hidden lg:block"
        delay={1.5}
        duration={7.2}
        yOffset={10}
        label="FORTRESS"
      />
      <IsometricPlatform 
        color="var(--accent-green-soft)" 
        className="left-[70px] top-[360px] hidden lg:block"
        delay={0.8}
        duration={9.3}
        yOffset={12}
        label="CORTEX"
      />

      {/* Large edge decorative slabs */}
      <EdgeSlab 
        color="var(--accent-green-soft)" 
        className="left-[-120px] top-[-40px] hidden xl:block"
        yOffset={8}
        duration={10}
      />
      <EdgeSlab 
        color="var(--accent-blue-soft)" 
        className="right-[-120px] top-[-60px] hidden xl:block"
        yOffset={11}
        duration={8.5}
      />
      <EdgeSlab 
        color="var(--accent-purple-soft)" 
        className="left-[-130px] bottom-[-80px] hidden xl:block"
        yOffset={14}
        duration={9.2}
      />
      <EdgeSlab 
        color="var(--accent-green-soft)" 
        className="right-[-110px] bottom-[-100px] hidden xl:block"
        yOffset={10}
        duration={11}
      />

      <div className="max-w-[1200px] mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center max-w-[900px] mx-auto"
        >
          {/* Eyebrow - cascaded */}
          <motion.div 
            className="mb-7"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <span 
              className="inline-block px-4 py-2 rounded-full text-[13px] font-semibold tracking-wide"
              style={{ 
                backgroundColor: 'var(--accent-green-soft)',
                color: 'var(--accent-green)'
              }}
            >
              AUTONOMOUS AI ENGINEERING LAYER
            </span>
          </motion.div>

          {/* Main Headline - cascaded */}
          <motion.h1 
            className="mb-7 tracking-tight leading-[1.1]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            style={{ 
              fontSize: '56px',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)'
            }}
          >
            Turn your codebase into a self-improving system.
          </motion.h1>

          {/* Subtext - cascaded */}
          <motion.p 
            className="mb-10 text-lg leading-[1.6] max-w-[720px] mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            style={{ color: 'var(--text-secondary)' }}
          >
            Velocis operates as an always-on senior engineer that autonomously reviews every commit, 
            orchestrates comprehensive QA loops, and provides real-time architecture intelligence—all 
            with zero idle overhead. Built for engineering teams that ship with confidence.
          </motion.p>

          {/* Primary CTA - cascaded */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
          >
            <motion.button
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="px-9 py-[14px] rounded-[12px] flex items-center gap-3 mx-auto transition-shadow hover:shadow-2xl mb-4"
              style={{ 
                backgroundColor: 'var(--cta-primary)',
                color: 'var(--cta-text)'
              }}
              onClick={handleConnect}
            >
              <Github className="w-5 h-5" />
              <span className="font-semibold text-[17px]">Connect with GitHub</span>
            </motion.button>

            {/* Trust text */}
            <motion.p 
              className="text-sm mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              style={{ color: 'var(--text-secondary)' }}
            >
              Works with private repositories • Setup in under 2 minutes
            </motion.p>

            {/* Micro trust badges row */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.65 }}
              className="flex flex-wrap items-center justify-center gap-4"
            >
              {trustBadges.map((badge, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.75 + index * 0.08 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border"
                  style={{ 
                    borderColor: 'var(--border-subtle)',
                    backgroundColor: 'white'
                  }}
                >
                  <badge.icon 
                    className="w-3.5 h-3.5 opacity-50" 
                    style={{ color: 'var(--text-primary)' }}
                    strokeWidth={2}
                  />
                  <span 
                    className="text-[11px] font-medium opacity-60"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {badge.text}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Client Logo Strip */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.9 }}
          className="mt-20 pt-12 border-t"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <p 
            className="text-center text-xs font-medium tracking-wider uppercase mb-8"
            style={{ color: 'var(--text-secondary)' }}
          >
            Trusted by teams using
          </p>
          <div className="flex flex-wrap items-center justify-center gap-12 md:gap-16">
            {clientLogos.map((logo, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: logo.opacity, y: 0 }}
                whileHover={{ opacity: 0.9 }}
                transition={{ duration: 0.4, delay: 1 + index * 0.08 }}
                className="font-semibold text-xl"
                style={{ color: 'var(--text-primary)' }}
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