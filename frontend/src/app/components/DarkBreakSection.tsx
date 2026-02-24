"use client";

import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Zap, ArrowRight, Brain, DollarSign, GitCommit, Shield, TestTube2, Eye as EyeIcon, CheckCircle } from 'lucide-react';

interface PipelineStep {
  icon: typeof GitCommit;
  label: string;
  description: string;
  status: 'complete' | 'active' | 'pending';
  color: string;
}

const features = [
  { icon: Zap, text: 'Webhook triggered intelligence' },
  { icon: ArrowRight, text: 'Serverless scale-to-zero' },
  { icon: Brain, text: 'Semantic reasoning engine' },
  { icon: DollarSign, text: 'Cost-aware infrastructure' },
];

const pipelineSteps: PipelineStep[] = [
  { icon: GitCommit, label: 'Git Push', description: 'Commit triggers webhook', status: 'complete', color: 'var(--accent-green)' },
  { icon: Shield, label: 'Sentinel Review', description: 'Deep semantic analysis', status: 'complete', color: 'var(--accent-purple)' },
  { icon: TestTube2, label: 'Fortress Test Loop', description: 'Comprehensive QA execution', status: 'active', color: 'var(--accent-blue)' },
  { icon: EyeIcon, label: 'Visual Cortex Update', description: 'Architecture visualization', status: 'pending', color: 'rgba(255, 255, 255, 0.3)' },
  { icon: CheckCircle, label: 'Merge with Confidence', description: 'Autonomous approval', status: 'pending', color: 'rgba(255, 255, 255, 0.3)' },
];

export function DarkBreakSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let frame = 0;
    const nodes = [
      { x: 0.25, y: 0.25, size: 8, status: 'ok' },
      { x: 0.5, y: 0.2, size: 10, status: 'ok' },
      { x: 0.75, y: 0.3, size: 7, status: 'error' },
      { x: 0.3, y: 0.55, size: 9, status: 'ok' },
      { x: 0.7, y: 0.6, size: 8, status: 'ok' },
      { x: 0.5, y: 0.75, size: 9, status: 'ok' },
    ];

    const animate = () => {
      frame++;
      const time = frame * 0.015;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, '#0b0b0c');
      gradient.addColorStop(1, '#0f0f10');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      ([[0, 1], [1, 2], [1, 4], [3, 4], [4, 5]] as const).forEach(([i, j]) => {
        const x1 = nodes[i].x * w, y1 = nodes[i].y * h;
        const x2 = nodes[j].x * w, y2 = nodes[j].y * h;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });

      nodes.forEach((node) => {
        const x = node.x * w, y = node.y * h;
        const pulse = node.status === 'error' ? Math.sin(time * 3) * 0.3 + 1.3 : 1;

        if (node.status === 'error') {
          const g = ctx.createRadialGradient(x, y, 0, x, y, node.size * 4);
          g.addColorStop(0, 'rgba(239, 68, 68, 0.3)');
          g.addColorStop(1, 'rgba(239, 68, 68, 0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, node.size * 4 * pulse, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = node.status === 'error' ? '#ef4444' : 'rgba(47, 182, 124, 0.8)';
        ctx.beginPath();
        ctx.arc(x, y, node.size * pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(x - 2, y - 2, node.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <section className="v-section-major bg-[--bg-dark]" aria-label="Autonomous pipeline">
      <div className="v-container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="mb-5 text-[--text-inverse]">
            From commit to confidence — automatically.
          </h2>
          <p className="text-[17px] leading-[1.6] max-w-[640px] mx-auto text-white/70">
            Every push triggers an intelligent autonomous pipeline that continuously improves your codebase
            through a closed feedback loop.
          </p>
        </motion.div>

        {/* Pipeline Visual */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="mb-16"
        >
          <div className="max-w-[700px] mx-auto rounded-[--radius-2xl] border border-white/[0.08] p-10 bg-[#111]/40 backdrop-blur-sm">
            <div className="relative">
              {pipelineSteps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.15 }}
                  className="flex items-start gap-5 relative"
                >
                  {/* Connection line */}
                  {index < pipelineSteps.length - 1 && (
                    <div
                      className="absolute left-[22px] top-[50px] w-0.5 h-[calc(100%+10px)]"
                      style={{
                        backgroundColor: step.status === 'pending'
                          ? 'rgba(255, 255, 255, 0.1)'
                          : 'rgba(47, 182, 124, 0.3)',
                      }}
                    />
                  )}

                  {/* Icon node */}
                  <div className="relative z-10 flex-shrink-0">
                    <motion.div
                      className="w-11 h-11 rounded-[--radius-xl] flex items-center justify-center border-2"
                      style={{
                        backgroundColor: step.status === 'pending'
                          ? 'rgba(255, 255, 255, 0.05)'
                          : step.status === 'active'
                            ? step.color
                            : 'rgba(47, 182, 124, 0.2)',
                        borderColor: step.status === 'pending'
                          ? 'rgba(255, 255, 255, 0.15)'
                          : step.color,
                      }}
                      animate={
                        step.status === 'active'
                          ? {
                            scale: [1, 1.1, 1],
                            boxShadow: [
                              '0 0 0 0 rgba(96, 165, 250, 0.7)',
                              '0 0 0 10px rgba(96, 165, 250, 0)',
                              '0 0 0 0 rgba(96, 165, 250, 0)',
                            ],
                          }
                          : {}
                      }
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <step.icon
                        className="w-5 h-5"
                        style={{ color: step.status === 'pending' ? 'rgba(255, 255, 255, 0.4)' : 'white' }}
                        strokeWidth={2}
                      />
                    </motion.div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-10">
                    <h4
                      className="font-bold text-[15px] mb-1"
                      style={{
                        color: step.status === 'pending' ? 'rgba(255, 255, 255, 0.5)' : 'var(--text-inverse)',
                      }}
                    >
                      {step.label}
                    </h4>
                    <p className="text-[13px] text-white/50">{step.description}</p>

                    {step.status === 'active' && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 flex items-center gap-2"
                      >
                        <motion.div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: step.color }}
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                        <span className="text-[11px] font-medium" style={{ color: step.color }}>
                          Running...
                        </span>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-[1000px] mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="rounded-[--radius-xl] p-5 border border-white/[0.08] bg-white/[0.03]"
            >
              <div className="w-10 h-10 rounded-[--radius-md] flex items-center justify-center mb-3 bg-[rgba(47,182,124,0.15)]">
                <feature.icon className="w-5 h-5 text-[--accent-green]" strokeWidth={2} />
              </div>
              <p className="text-[14px] font-medium leading-snug text-[--text-inverse]">{feature.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
