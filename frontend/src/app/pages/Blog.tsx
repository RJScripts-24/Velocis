"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import { useNavigate } from 'react-router';
import { Clock, X, Users, Shield, Info, ArrowRight, Mail, Check, ArrowUpRight, Copy, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';

interface BlogPost { id: string; slug: string; title: string; subtitle: string; category: string; categoryColor: string; readTime: string; date: string; author: { name: string; initials: string; role: string; ringColor: string; }; excerpt: string; tags: string[]; featured: boolean; coverPattern: string; content: string; }

const POSTS: BlogPost[] = [
  {
    id: '001', slug: 'seniority-bottleneck', title: 'Why Your Senior Engineers Are Drowning', subtitle: 'The hidden cost of the seniority bottleneck in modern engineering teams', category: 'Engineering Culture', categoryColor: '#1A7F3C', readTime: '8 min read', date: 'March 1, 2026', author: { name: 'Rishabh Kumar Jha', initials: 'RKJ', role: 'Team Leader', ringColor: '#1A7F3C' }, excerpt: 'Every senior engineer we interviewed said the same thing: they spend more than half their time reviewing code that should never have reached them. We built Velocis because we believed there was a better way.', tags: ['Engineering', 'Productivity', 'AI', 'Code Review'], featured: true, coverPattern: 'linear-gradient(135deg,#0d1117 0%,#1a2a1a 50%,#0d1117 100%)',
    content: 'Every senior engineer we interviewed said the same thing: they spend more than half their time reviewing code that should never have reached them. We tracked this across twelve teams and found that, on average, 58 percent of senior engineer review time is spent on issues that could be caught by a well-designed automated system.\n\nWhen we built Sentinel, we made one design decision above all others: it should explain its reasoning the way a senior engineer would, not the way a linter does. A linter tells you what is wrong. Sentinel tells you why it matters and what a better approach looks like. The goal was never to replace senior engineers — it was to give junior developers the feedback loop they were previously missing.'
  },
  {
    id: '002', slug: 'sentinel-semantic-review', title: 'Introducing Sentinel: Semantic Code Review Beyond Linting', subtitle: 'How we built an AI agent that understands business logic, not just syntax', category: 'Product', categoryColor: '#1A56DB', readTime: '12 min read', date: 'February 22, 2026', author: { name: 'Parinita Tiwari', initials: 'PT', role: 'Core Member', ringColor: '#1A56DB' }, excerpt: 'Static analysis tools check syntax. Sentinel checks intent. Here is the architectural story of how we built a code reviewer that teaches developers the why behind every issue it finds.', tags: ['Sentinel', 'AI', 'Code Review', 'AWS Bedrock'], featured: true, coverPattern: 'linear-gradient(135deg,#0d1117 0%,#1a1a2e 50%,#0d1117 100%)',
    content: 'The fundamental difference between a static analysis tool and Sentinel is the difference between pattern matching and reasoning. ESLint sees that you called a function incorrectly. Sentinel sees that mistake in the context of your entire service and explains why it will cause a race condition under concurrent load.\n\nWe use Claude 3.5 Sonnet on Amazon Bedrock for Sentinel reviews. The key breakthrough was moving from asking the model to find bugs to asking it to reason about intent alignment: does this implementation do what the PR description says, and are there cases where it would not? This framing produces reviews that developers actually want to read.'
  },
  {
    id: '003', slug: 'fortress-tdd', title: 'Zero-Touch TDD: How Fortress Writes, Runs, and Fixes Your Tests', subtitle: 'Building a self-healing test loop with AWS Step Functions', category: 'Deep Dive', categoryColor: '#6D28D9', readTime: '15 min read', date: 'February 15, 2026', author: { name: 'Harsh Singhal', initials: 'HS', role: 'Core Member', ringColor: '#6D28D9' }, excerpt: 'The most common excuse for poor test coverage is time. Fortress eliminates that excuse entirely. Here is exactly how the self-healing loop works under the hood.', tags: ['Fortress', 'Testing', 'AWS Step Functions', 'TDD'], featured: false, coverPattern: 'linear-gradient(135deg,#0d1117 0%,#1a0d2e 50%,#0d1117 100%)',
    content: 'Fortress operates as a three-phase AWS Step Functions state machine. Phase one: generate a test suite using Claude 3.5 by inferring expected behavior from the implementation. Phase two: execute those tests in an isolated Lambda environment. Phase three: if any tests fail, feed the failure output back and loop until all tests pass.\n\nThe self-healing loop is what makes Fortress genuinely novel. Most AI code generation tools generate code and stop. Fortress generates, verifies, and corrects — treating test execution output as a grounding signal. In our internal testing, Fortress achieves test suite fixup within 2.3 iterations on average.'
  },
  {
    id: '004', slug: 'visual-cortex-docs', title: 'Live Architecture Maps: Visual Cortex and the End of Stale Docs', subtitle: 'How ReactFlow and GSAP power documentation that updates itself', category: 'Product', categoryColor: '#1A56DB', readTime: '10 min read', date: 'February 8, 2026', author: { name: 'Rishabh Kumar Jha', initials: 'RKJ', role: 'Team Leader', ringColor: '#1A7F3C' }, excerpt: 'Documentation that is written once and never touched is worse than no documentation. Visual Cortex generates architecture maps that update the moment code changes.', tags: ['Visual Cortex', 'ReactFlow', 'Documentation', 'Architecture'], featured: false, coverPattern: 'linear-gradient(135deg,#0d1117 0%,#0d1a2e 50%,#0d1117 100%)',
    content: 'The standard lifecycle of architecture documentation: a senior engineer spends a weekend creating a beautiful diagram in Miro. It is accurate the day it is published. Within three months, four services have been added and two renamed. The diagram is now actively misleading. Visual Cortex breaks this cycle by generating maps directly from code — analyzing import graphs, API call patterns, and database access patterns.\n\nThe rendering layer uses ReactFlow for graph layout and GSAP for transitions. We deliberately chose not to make diagrams look hand-drawn. They look like what they are: programmatically derived maps. Engineers immediately know the diagram was generated from code, not drawn by someone working from memory.'
  },
  {
    id: '005', slug: 'bedrock-model-selection', title: 'Building on Amazon Bedrock: Choosing the Right Model for Code Intelligence', subtitle: 'Claude 3.5 Sonnet vs Llama 3 — when to use which', category: 'Engineering', categoryColor: '#EA580C', readTime: '11 min read', date: 'January 30, 2026', author: { name: 'Parinita Tiwari', initials: 'PT', role: 'Core Member', ringColor: '#1A56DB' }, excerpt: 'We run two foundation models in production. Claude 3.5 Sonnet handles deep reasoning. Llama 3 handles speed. Here is the decision framework we built.', tags: ['AWS Bedrock', 'Claude', 'Llama 3', 'AI Infrastructure'], featured: false, coverPattern: 'linear-gradient(135deg,#0d1117 0%,#2e1a0d 50%,#0d1117 100%)',
    content: 'We use Claude 3.5 Sonnet on Amazon Bedrock for all tasks requiring deep semantic reasoning — pull request review, architecture analysis, documentation generation. We use Llama 3 for tasks where speed matters more: quick syntax checks, tag classification, and the initial triage pass that decides whether deeper review is warranted.\n\nThe routing layer was the hardest part to build. We ended up with a rule-based classifier: if the changed file count exceeds eight or the diff contains architectural surface area (new exports, changed interfaces, schema touches), route to Claude. Otherwise route to Llama 3 for a faster first pass. This hybrid approach reduced our average review latency by 34 percent.'
  },
  {
    id: '006', slug: 'skill-gap-tooling', title: 'The Skill Gap Is Not a Talent Problem. It Is a Tooling Problem.', subtitle: 'Why the software industry keeps solving the wrong problem', category: 'Engineering Culture', categoryColor: '#1A7F3C', readTime: '7 min read', date: 'January 22, 2026', author: { name: 'Rishabh Kumar Jha', initials: 'RKJ', role: 'Team Leader', ringColor: '#1A7F3C' }, excerpt: 'Junior developers are not getting worse. The gap between junior output and production standards is growing because our tools still assume a senior engineer is always watching.', tags: ['Engineering Culture', 'Developer Experience', 'Mentorship'], featured: false, coverPattern: 'linear-gradient(135deg,#0d1117 0%,#1a2a0d 50%,#0d1117 100%)',
    content: 'The discourse around the engineering skill gap focuses almost entirely on education. But these solutions share a hidden assumption: the problem is on the input side. We believe the gap is primarily a feedback problem. Junior engineers lack the fast, high-quality feedback loop that would accelerate their growth. A senior engineer reviewing ten pull requests a day cannot give each one the deep, pedagogical attention that would actually transfer knowledge.\n\nEvery Sentinel review is written to be educational, not just correctional. We do not just flag the issue — we explain the principle behind it, the tradeoffs in different solutions, and the context in which each solution makes sense. We are trying to make the experience of committing code feel like pair programming with someone who has infinite time and genuine interest in your growth.'
  },
  {
    id: '007', slug: 'processing-pipeline', title: 'Webhooks, Lambda, and Real-Time Code Analysis: The Architecture', subtitle: 'How Velocis processes a pull request in under 90 seconds', category: 'Deep Dive', categoryColor: '#6D28D9', readTime: '14 min read', date: 'January 15, 2026', author: { name: 'Harsh Singhal', initials: 'HS', role: 'Core Member', ringColor: '#6D28D9' }, excerpt: 'From the moment a developer opens a pull request to the moment Sentinel posts its review, here is every component and every design decision in the Velocis pipeline.', tags: ['Architecture', 'AWS Lambda', 'Webhooks', 'Performance'], featured: false, coverPattern: 'linear-gradient(135deg,#0d1117 0%,#1a0d2e 50%,#0d1117 100%)',
    content: 'The Velocis processing pipeline is entirely serverless. When a pull request is opened, GitHub sends a webhook to our API Gateway endpoint. API Gateway validates the HMAC-SHA256 signature and routes the event to the Dispatcher Lambda. The Dispatcher enqueues a job to SQS. The Processor Lambda pulls from SQS and makes the Bedrock API calls — embedding via Titan Embeddings, retrieving context from DynamoDB, then invoking Claude 3.5 Sonnet.\n\nThe 90-second target requires optimization at every step. We parallelize file fetches using Promise.all and use streaming Bedrock responses to start processing output before the full response completes. End-to-end P95 latency in production is 87 seconds for PRs under 500 lines of diff.'
  },
  {
    id: '008', slug: 'dogfooding-velocis', title: 'Kiro and Spec-Driven Development: How We Build Velocis with Velocis', subtitle: 'Using our own product to build our own product', category: 'Engineering', categoryColor: '#EA580C', readTime: '9 min read', date: 'January 8, 2026', author: { name: 'Rishabh Kumar Jha', initials: 'RKJ', role: 'Team Leader', ringColor: '#1A7F3C' }, excerpt: 'We use Velocis to build Velocis. Sentinel reviews every pull request we open. Fortress tests every function we write. Here is what we learned from dogfooding our own AI team member.', tags: ['Kiro', 'Developer Experience', 'Meta', 'Dogfooding'], featured: false, coverPattern: 'linear-gradient(135deg,#0d1117 0%,#2e1a0d 50%,#0d1117 100%)',
    content: 'Building with your own product is the best form of quality assurance and the hardest form of honesty. When Sentinel flags an issue in our own code, we cannot dismiss it. This feedback loop drove some of our most important product improvements. The most common complaint in early testing was that Sentinel was too verbose — and we discovered this was true because Sentinel reviewed our own PRs that way, and it was genuinely annoying.\n\nKiro is the speccing agent within Velocis. Before writing any significant feature, Kiro generates a technical specification: proposed API surface, data model changes, edge cases, and open questions. The irony is that Kiro is itself one of the features we specced using Kiro. The recursive quality of this is something we find genuinely funny.'
  },
  {
    id: '009', slug: 'rag-titan-embeddings', title: 'RAG for Code: How Titan Embeddings Powers Contextual Intelligence', subtitle: 'Building a knowledge base that understands your entire codebase', category: 'Deep Dive', categoryColor: '#6D28D9', readTime: '13 min read', date: 'December 28, 2025', author: { name: 'Parinita Tiwari', initials: 'PT', role: 'Core Member', ringColor: '#1A56DB' }, excerpt: 'A code reviewer that does not understand your codebase context is just a linter. We built a RAG pipeline using Amazon Titan Embeddings that gives Sentinel memory of your entire repository.', tags: ['RAG', 'Titan Embeddings', 'AI', 'Bedrock Knowledge Bases'], featured: false, coverPattern: 'linear-gradient(135deg,#0d1117 0%,#1a0d2e 50%,#0d1117 100%)',
    content: 'RAG for code is fundamentally different from RAG for text. The granularity problem is harder: what is the right chunk size? A file is too large. A function is sometimes too small. We ended up with a hybrid strategy — indexing at the function and class level, but including enough surrounding context that chunks are self-contained. Each chunk is embedded using Amazon Titan Embeddings V2, which outperformed OpenAI embeddings on code similarity in our internal benchmarks.\n\nThe retrieval step runs before every Sentinel review. When a PR arrives, we embed the changed code and retrieve the top twelve semantically similar chunks from the repository knowledge base. These chunks are inserted into the review prompt as context: here is how similar patterns have been implemented elsewhere in this codebase. Teams with large, established codebases see the largest quality gains from this feature.'
  },
];

// ─── Shared Utilities ────────────────────────────────────────────────────────

const GStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
    *{box-sizing:border-box;}
    html{scroll-behavior:smooth;}
    body{font-family:'Inter',sans-serif;background:#fff;color:#16141A;font-feature-settings:"kern"1,"liga"1,"calt"1;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased;}
    ::selection{background:rgba(26,127,60,0.15);color:#16141A;}
    .fb{font-family:'Libre Baskerville',serif;} .fm{font-family:'JetBrains Mono',monospace;}
    button:focus-visible,a:focus-visible{outline:2px solid #1A7F3C;outline-offset:3px;}
    @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;}}
    @keyframes blink{50%{opacity:0;}} @keyframes breathe{0%,100%{transform:scale(.95);opacity:.5;}50%{transform:scale(1.05);opacity:1;}}
    @keyframes pr{0%{box-shadow:0 0 0 0 rgba(26,127,60,.4);}70%{box-shadow:0 0 0 8px rgba(26,127,60,0);}100%{box-shadow:0 0 0 0 rgba(26,127,60,0);}}`}
  </style>
);

const ProgBar = () => { const { scrollYProgress } = useScroll(); const sx = useSpring(scrollYProgress, { stiffness: 100, damping: 30 }); return <motion.div style={{ scaleX: sx }} className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#1A7F3C] to-[#3FB950] origin-left z-[9999]"><div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-1 bg-[#3FB950] rounded-full shadow-[0_0_6px_#3FB950]" /></motion.div>; };
const Grain = () => <div style={{ position: 'fixed', inset: 0, zIndex: 999, pointerEvents: 'none', opacity: .04, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />;

const Canvas = () => {
  const cr = useRef<HTMLCanvasElement>(null), rf = useRef(0);
  useEffect(() => {
    const c = cr.current; if (!c) return;
    const ctx = c.getContext('2d')!;
    const rs = () => { c.width = c.offsetWidth; c.height = c.offsetHeight; };
    rs(); window.addEventListener('resize', rs);
    const ns = Array.from({ length: 55 }, () => ({ x: Math.random() * c.width, y: Math.random() * c.height, vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35, pulse: 0, pDir: 0 }));
    let pt = 0;
    const draw = () => {
      if (document.hidden) { rf.current = requestAnimationFrame(draw); return; }
      ctx.clearRect(0, 0, c.width, c.height); pt++;
      if (pt > 200) { ns[Math.floor(Math.random() * ns.length)].pDir = 1; pt = 0; }
      ns.forEach((n, i) => {
        if (n.pDir === 1) { n.pulse += .12; if (n.pulse >= 1) n.pDir = -1; } else if (n.pDir === -1) { n.pulse -= .12; if (n.pulse <= 0) { n.pulse = 0; n.pDir = 0; } }
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > c.width) n.vx *= -1; if (n.y < 0 || n.y > c.height) n.vy *= -1;
        ns.slice(i + 1).forEach(m => { const d = Math.hypot(n.x - m.x, n.y - m.y); if (d < 140) { ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y); ctx.strokeStyle = `rgba(26,127,60,${.12 * (1 - d / 140)})`; ctx.lineWidth = 1; ctx.stroke(); } });
        ctx.beginPath(); ctx.arc(n.x, n.y, 1.5 + n.pulse * 3, 0, Math.PI * 2);
        if (n.pulse > 0) { ctx.shadowBlur = 14; ctx.shadowColor = `rgba(46,164,79,${n.pulse * .28})`; } else ctx.shadowBlur = 0;
        ctx.fillStyle = n.pulse > 0 ? `rgba(46,164,79,${.18 + n.pulse * .2})` : 'rgba(26,127,60,0.18)'; ctx.fill();
      });
      rf.current = requestAnimationFrame(draw);
    };
    rf.current = requestAnimationFrame(draw);
    return () => { window.removeEventListener('resize', rs); cancelAnimationFrame(rf.current); };
  }, []);
  return <canvas ref={cr} className="absolute inset-0 w-full h-full pointer-events-none" />;
};

const Lbl = ({ children, color = '#1A7F3C', pill }: { children: React.ReactNode; color?: string; pill?: boolean }) => (
  <div className={`fm uppercase text-[11px] tracking-[0.14em] inline-block${pill ? ' border border-[rgba(26,127,60,0.3)] bg-[rgba(26,127,60,0.05)] rounded-full px-4 py-1.5' : ''}`} style={{ color }}>{children}</div>
);
const FadeUp = ({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) => (
  <motion.div initial={{ opacity: 0, y: 36 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: .7, delay, ease: [.25, .1, .25, 1] }} className={className}>{children}</motion.div>
);
const Divider = () => <div className="flex flex-col items-center gap-3 py-2 pointer-events-none opacity-20"><div className="w-px h-10 bg-gradient-to-b from-transparent via-[#E8E5DF] to-transparent" /><div className="flex gap-2">{[0, 1, 2].map(i => <div key={i} className="w-1 h-1 rounded-full bg-[#1A7F3C]" />)}</div></div>;

const Frags = ({ s }: { s: 'left' | 'right' }) => {
  const fs = s === 'left' ? ["git commit -m 'blog'", "draft.publish()", "words.count()", "read_time: 5min", "author.write()"] : ["ideas.push(new)", "post.status = live", "readers++", "knowledge.share()", "learn.everyday()"];
  return <div className={`fixed top-0 bottom-0 ${s === 'left' ? 'left-4' : 'right-4'} w-36 pointer-events-none hidden xl:flex flex-col justify-around z-0`}>{fs.map((f, i) => <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: .2, x: s === 'left' ? [0, 6, 0] : [0, -6, 0], y: [0, -14, 0] }} transition={{ duration: 6 + i * 1.2, delay: i * 1.1, repeat: Infinity, ease: 'easeInOut' }} className="fm text-[11px] text-[#1A7F3C] whitespace-nowrap">{f}</motion.div>)}</div>;
};

const Nav = () => {
  const navigate = useNavigate();
  const [sc, setSc] = useState(false);
  useEffect(() => { const h = () => setSc(window.scrollY > 80); window.addEventListener('scroll', h); return () => window.removeEventListener('scroll', h); }, []);
  return (
    <motion.nav initial={{ y: -60, opacity: 0 }} animate={{ y: sc ? 0 : -60, opacity: sc ? 1 : 0 }} className="fixed top-0 left-0 right-0 h-[60px] z-[5000] px-8 flex items-center justify-between border-b border-[#E8E5DF] bg-[rgba(255,255,255,0.92)] backdrop-blur-[16px]" style={{ boxShadow: sc ? '0 1px 0 rgba(22,20,26,0.08)' : 'none' }}>
      <div className="flex items-center gap-2"><span className="fb font-bold text-[18px]">Velocis.</span><div className="w-[2px] h-[13px] bg-[#1A7F3C] animate-[blink_1.1s_step-end_infinite]" /></div>
      <div className="hidden md:flex items-center gap-8 font-[500] text-[14px] text-[#4B4856]">
        {[['About', '/about'], ['Careers', '/careers'], ['Blog', '/blog'], ['Security', '/security'], ['Contact', '/contact']].map(([x, href]) => (
          <a key={x} href={href} target="_blank" rel="noopener noreferrer" className={`relative group transition-colors ${x === 'Blog' ? 'text-[#16141A] font-semibold' : 'hover:text-[#16141A]'}`} onClick={(e) => { if (href.startsWith('/')) { e.preventDefault(); window.open(href, '_blank', 'noopener,noreferrer'); } }}>{x}<span className={`absolute -bottom-1 left-0 w-full h-[1px] bg-[#1A7F3C] origin-left transition-transform duration-200 ${x === 'Blog' ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} /></a>
        ))}
      </div>
      <motion.button whileHover={{ y: -1, backgroundColor: '#1A7F3C', boxShadow: '0 4px 12px rgba(26,127,60,0.25)' }} className="bg-[#16141A] text-white px-[18px] py-[9px] rounded-[8px] font-semibold text-[13px]">Connect GitHub</motion.button>
    </motion.nav>
  );
};

const catColor = (cat: string) => {
  if (cat === 'Engineering Culture') return { bg: '#DCFCE7', color: '#1A7F3C' };
  if (cat === 'Product') return { bg: '#EFF6FF', color: '#1A56DB' };
  if (cat === 'Deep Dive') return { bg: '#F5F3FF', color: '#6D28D9' };
  return { bg: '#FFF7ED', color: '#EA580C' };
};

const AuthorChip = ({ a, size = 32 }: { a: BlogPost['author']; size?: number }) => (
  <div className="flex items-center gap-2">
    <div className="rounded-full flex items-center justify-center fb font-bold text-[10px] text-[#F0F6FC] flex-shrink-0" style={{ width: size, height: size, background: 'linear-gradient(135deg,#1C1A28,#2A2838)', boxShadow: `0 0 0 2px white,0 0 0 4px ${a.ringColor}`, fontSize: size > 36 ? 14 : 10 }}>{a.initials}</div>
    <div><div className="font-semibold text-[12px] text-[#16141A] leading-none">{a.name}</div><div className="fm text-[10px] text-[#9B97A8]">{a.role}</div></div>
  </div>
);

const CoverViz = ({ pattern, h = 160 }: { pattern: string; h?: number }) => (
  <div className="overflow-hidden flex-shrink-0 group-hover:[&>div]:scale-[1.05] transition-transform duration-500" style={{ height: h }}>
    <div className="w-full h-full transition-transform duration-500" style={{ background: pattern }}>
      <div className="p-3 flex flex-col gap-1.5 h-full justify-end">
        {[80, 60, 90, 45, 70, 55].map((w, i) => <div key={i} className="rounded-[2px] h-1.5 opacity-60" style={{ width: `${w}%`, background: i % 3 === 0 ? '#3FB950' : i % 3 === 1 ? '#58A6FF' : '#FF7B72' }} />)}
      </div>
    </div>
  </div>
);

const CircuitBg = () => {
  const r1 = useRef<SVGPathElement>(null), r2 = useRef<SVGPathElement>(null), sec = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sec.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        [r1.current, r2.current].forEach(p => { if (!p) return; const len = p.getTotalLength(); p.style.strokeDasharray = `${len}`; p.style.strokeDashoffset = `${len}`; p.style.transition = 'stroke-dashoffset 3s ease'; requestAnimationFrame(() => { p.style.strokeDashoffset = '0'; }); });
        obs.disconnect();
      }
    }, { threshold: 0.3 });
    obs.observe(el); return () => obs.disconnect();
  }, []);
  return (
    <div ref={sec} className="absolute inset-0 pointer-events-none overflow-hidden">
      <svg width="100%" height="100%" viewBox="0 0 1200 500" preserveAspectRatio="xMidYMid slice" className="absolute inset-0">
        {[[200, 80], [400, 80], [600, 200], [800, 80], [1000, 200]].map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r={4} fill="rgba(46,164,79,0.26)"><animate attributeName="r" values="4;7;4" dur={`${2 + i * .3}s`} repeatCount="indefinite" /></circle>)}
        <path ref={r1} d="M 100 80 L 200 80 L 200 200 L 400 200 L 400 80 L 600 80 L 600 200 L 800 200 L 800 80 L 1000 80 L 1000 200" fill="none" stroke="rgba(26,127,60,0.16)" strokeWidth="1.2" />
        <path ref={r2} d="M 100 320 L 300 320 L 300 200 L 500 200 L 500 320 L 700 320 L 900 320 L 1100 320" fill="none" stroke="rgba(26,127,60,0.14)" strokeWidth="1.2" />
        <circle r="4" fill="rgba(63,185,80,0.55)"><animateMotion dur="6s" repeatCount="indefinite" path="M 100 80 L 200 80 L 200 200 L 400 200 L 400 80 L 600 80 L 600 200 L 800 200 L 800 80 L 1000 80 L 1000 200" /></circle>
      </svg>
    </div>
  );
};

// ─── MAIN BLOG PAGE ─────────────────────────────────────────────────────────
export default function BlogPage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subStatus, setSubStatus] = useState<'idle' | 'busy' | 'done'>('idle');
  const [cta2Email, setCta2Email] = useState('');

  const categories = ['All', 'Engineering Culture', 'Product', 'Deep Dive', 'Engineering'];
  const featured = POSTS.filter(p => p.featured);
  const filtered = useMemo(() => activeCategory === 'All' ? POSTS.filter(p => !p.featured) : POSTS.filter(p => p.category === activeCategory && !p.featured), [activeCategory]);
  const allFiltered = useMemo(() => activeCategory === 'All' ? POSTS : POSTS.filter(p => p.category === activeCategory), [activeCategory]);

  // lock body scroll when modal is open
  useEffect(() => { document.body.style.overflow = selectedPost ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [selectedPost]);

  const curIdx = selectedPost ? POSTS.findIndex(p => p.id === selectedPost.id) : -1;

  const CardCover = ({ post, h }: { post: BlogPost; h: number }) => (
    <div className="overflow-hidden flex-shrink-0" style={{ height: h }}>
      <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: .4 }} className="w-full h-full" style={{ background: post.coverPattern }}>
        <div className="p-3 flex flex-col gap-1.5 h-full justify-end">
          {[80, 55, 90, 45, 70].map((w, i) => <div key={i} className="rounded-sm h-1.5 opacity-60" style={{ width: `${w}%`, background: i % 3 === 0 ? '#3FB950' : i % 3 === 1 ? '#58A6FF' : '#FF7B72' }} />)}
        </div>
      </motion.div>
    </div>
  );

  const ArticleCard = ({ post, featured }: { post: BlogPost; featured?: boolean }) => {
    const cc = catColor(post.category);
    return (
      <motion.div layout initial={{ opacity: 0, y: 24, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: .96 }} transition={{ duration: .35 }} whileHover={{ y: featured ? -8 : -6, boxShadow: '0 20px 56px rgba(22,20,26,0.12)', borderColor: 'rgba(26,127,60,0.2)' }} onClick={() => setSelectedPost(post)}
        className={`bg-white border border-[#E8E5DF] ${featured ? 'rounded-[20px]' : 'rounded-[16px]'} overflow-hidden cursor-pointer group`} style={{ boxShadow: '0 2px 8px rgba(22,20,26,0.04)' }}>
        <CardCover post={post} h={featured ? 200 : 140} />
        <div className={`${featured ? 'p-7' : 'p-5'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="fm text-[10px] px-3 py-1 rounded-full font-medium" style={{ background: cc.bg, color: cc.color }}>{post.category}</span>
            <span className="fm text-[10px] text-[#9B97A8] flex items-center gap-1"><Clock size={11} />{post.readTime}</span>
          </div>
          <h3 className={`fb font-bold text-[#16141A] leading-[1.2] group-hover:text-[#1A7F3C] transition-colors ${featured ? 'text-[22px]' : 'text-[18px]'} overflow-hidden`} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{post.title}</h3>
          <p className="text-[#6B6778] mt-1.5 leading-[1.6] overflow-hidden text-[13px]" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{post.subtitle}</p>
          {featured && <p className="text-[13px] text-[#6B6778] mt-3 leading-[1.65] overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{post.excerpt}</p>}
          {!featured && <div className="flex flex-wrap gap-1.5 mt-3">{post.tags.slice(0, 3).map(t => <span key={t} className="bg-[#F7F6F3] border border-[#E8E5DF] text-[#6B6778] fm text-[10px] px-2.5 py-0.5 rounded-full hover:bg-[#F0FDF4] hover:text-[#1A7F3C] transition-colors">{t}</span>)}</div>}
          <div className={`flex items-center justify-between pt-3 mt-3 border-t border-[#F0EDE8] ${!featured ? 'mt-3' : 'mt-5'}`}>
            <AuthorChip a={post.author} />
            <span className="fm text-[11px] text-[#9B97A8]">{post.date}</span>
          </div>
          {featured && <div className="mt-4"><span className="font-semibold text-[13px] text-[#1A7F3C] inline-flex items-center gap-1 group/l">Read article <ArrowRight size={14} className="group-hover/l:translate-x-1 transition-transform" /></span></div>}
        </div>
      </motion.div>
    );
  };

  const Modal = () => {
    if (!selectedPost) return null;
    const cc = catColor(selectedPost.category);
    const prev = curIdx > 0 ? POSTS[curIdx - 1] : null;
    const next = curIdx < POSTS.length - 1 ? POSTS[curIdx + 1] : null;
    return (
      <AnimatePresence>
        <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedPost(null)} className="fixed inset-0 z-[1000] bg-[rgba(22,20,26,0.6)] backdrop-blur-[4px]" />
        <motion.div key="panel" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: .4, ease: [.22, 1, .36, 1] }} className="fixed right-0 top-0 h-screen z-[1001] bg-white overflow-y-auto" style={{ width: 'min(680px,100vw)', boxShadow: '-24px 0 80px rgba(22,20,26,0.15)' }}>
          <div className="sticky top-0 z-10 bg-[rgba(255,255,255,0.95)] backdrop-blur-[8px] border-b border-[#E8E5DF] px-7 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3"><span className="fm text-[10px] px-3 py-1 rounded-full" style={{ background: cc.bg, color: cc.color }}>{selectedPost.category}</span><span className="fm text-[11px] text-[#9B97A8] flex items-center gap-1"><Clock size={11} />{selectedPost.readTime}</span></div>
            <button onClick={() => setSelectedPost(null)} className="w-8 h-8 rounded-full bg-[#F7F6F3] hover:bg-[#E8E5DF] flex items-center justify-center transition-colors"><X size={16} className="text-[#16141A]" /></button>
          </div>
          <div className="h-[200px] overflow-hidden relative"><div className="w-full h-full" style={{ background: selectedPost.coverPattern }}><div className="p-4 flex flex-col gap-2 h-full justify-end">{[80, 55, 90, 45, 70, 60].map((w, i) => <div key={i} className="rounded-sm h-2 opacity-50" style={{ width: `${w}%`, background: i % 3 === 0 ? '#3FB950' : i % 3 === 1 ? '#58A6FF' : '#FF7B72' }} />)}</div></div><div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent" /></div>
          <div className="px-9 pb-16 pt-6">
            <div className="flex flex-wrap gap-1.5 mb-5">{selectedPost.tags.map(t => <span key={t} className="bg-[#F7F6F3] border border-[#E8E5DF] fm text-[10px] px-3 py-1 rounded-full text-[#6B6778]">{t}</span>)}</div>
            <h1 className="fb font-bold text-[28px] text-[#16141A] leading-[1.15] tracking-[-0.02em]">{selectedPost.title}</h1>
            <p className="text-[16px] text-[#6B6778] mt-3 leading-[1.6]">{selectedPost.subtitle}</p>
            <div className="flex items-center justify-between py-4 my-4 border-y border-[#F0EDE8]">
              <AuthorChip a={selectedPost.author} size={40} />
              <span className="fm text-[11px] text-[#9B97A8]">{selectedPost.date} · {selectedPost.readTime}</span>
            </div>
            <div className="space-y-5">
              {selectedPost.content.split('\n\n').map((para, i) => (
                <p key={i} className="text-[16px] text-[#16141A] leading-[1.8]">{para}</p>
              ))}
            </div>
            <div className="mt-12 p-5 bg-[rgba(26,127,60,0.04)] border-l-[3px] border-[#1A7F3C] rounded-r-[8px]">
              <p className="fb italic text-[16px] text-[#2C2A36] leading-[1.7]">"{selectedPost.excerpt}"</p>
            </div>
            {(prev || next) && (
              <div className="mt-10 grid grid-cols-2 gap-3">
                {prev ? <button onClick={() => setSelectedPost(prev)} className="bg-[#F7F6F3] border border-[#E8E5DF] rounded-[10px] p-4 text-left hover:border-[rgba(26,127,60,0.2)] transition-colors group"><div className="flex items-center gap-1 fm text-[10px] text-[#9B97A8] mb-1"><ChevronLeft size={12} />Previous</div><p className="font-semibold text-[12px] text-[#16141A] line-clamp-2 group-hover:text-[#1A7F3C] transition-colors">{prev.title}</p></button> : <div />}
                {next ? <button onClick={() => setSelectedPost(next)} className="bg-[#F7F6F3] border border-[#E8E5DF] rounded-[10px] p-4 text-right hover:border-[rgba(26,127,60,0.2)] transition-colors group"><div className="flex items-center justify-end gap-1 fm text-[10px] text-[#9B97A8] mb-1">Next<ChevronRight size={12} /></div><p className="font-semibold text-[12px] text-[#16141A] line-clamp-2 group-hover:text-[#1A7F3C] transition-colors">{next.title}</p></button> : <div />}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    );
  };

  const subscribe = () => { if (!newsletterEmail.includes('@')) return; setSubStatus('busy'); setTimeout(() => setSubStatus('done'), 900); };

  return (
    <div className="min-h-screen bg-white">
      <GStyle /><ProgBar /><Grain /><Nav />

      {/* HERO */}
      <section className="relative pt-14 pb-10 bg-white overflow-hidden text-center px-6">
        <Canvas />
        <div className="absolute inset-0 pointer-events-none animate-[breathe_9s_ease-in-out_infinite] bg-[radial-gradient(ellipse_600px_280px_at_50%_50%,rgba(26,127,60,0.04)_0%,transparent_70%)]" />
        <div className="relative z-10 max-w-[640px] mx-auto">
          <motion.div initial={{ scale: .85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }} className="mb-3"><Lbl pill>THE VELOCIS BLOG</Lbl></motion.div>
          <h1 className="fb font-bold text-[56px] leading-[1.08] tracking-[-0.03em] text-[#16141A]">
            {['Ideas', 'worth', 'shipping.'].map((w, i) => <span key={i} className="inline-block overflow-hidden align-bottom mr-[0.2em]"><motion.span initial={{ y: '110%', filter: 'blur(8px)' }} animate={{ y: 0, filter: 'blur(0)' }} transition={{ duration: .65, delay: .1 + i * .055, ease: [.22, 1, .36, 1] }} className="inline-block">{w}</motion.span></span>)}
          </h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .4, duration: .6 }} className="text-[17px] text-[#6B6778] leading-[1.68] mt-4 max-w-[480px] mx-auto">Engineering insights, product deep dives, and honest reflections on building autonomous AI developer tools. Written by the Merge Conflict team.</motion.p>
          <div className="flex flex-wrap justify-center gap-3 mt-5">
            {[{ t: '9 articles', a: true }, { t: '3 authors', a: false }, { t: 'Weekly updates', a: false }].map((x, i) => <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .6 + i * .1 }} className={`fm text-[12px] px-4 py-1.5 border rounded-full ${x.a ? 'border-[rgba(26,127,60,0.3)] text-[#1A7F3C] animate-[pr_2s_infinite]' : 'border-[#E8E5DF] text-[#6B6778]'}`}>{x.t}</motion.div>)}
          </div>
        </div>
      </section>

      {/* FILTER BAR */}
      <div className="sticky top-[0px] z-10 bg-[rgba(255,255,255,0.95)] backdrop-blur-[8px] border-b border-[#E8E5DF] py-3 px-6">
        <div className="max-w-[1080px] mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={`fm text-[12px] px-4 py-1.5 rounded-full transition-all ${activeCategory === cat ? 'bg-[#16141A] text-white' : 'bg-[#F7F6F3] text-[#6B6778] border border-[#E8E5DF] hover:bg-[#F0FDF4] hover:text-[#1A7F3C] hover:border-[rgba(26,127,60,0.2)]'}`}>{cat}</button>
            ))}
          </div>
          <span className="fm text-[11px] text-[#9B97A8] flex-shrink-0">Showing {allFiltered.length} article{allFiltered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* FEATURED */}
      {(activeCategory === 'All') && (
        <section className="bg-white py-10 px-6">
          <div className="max-w-[1080px] mx-auto">
            <Lbl>● FEATURED</Lbl>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5">
              {featured.map((p, i) => <motion.div key={p.id} initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: .7, delay: i * .15 }}><ArticleCard post={p} featured /></motion.div>)}
            </div>
          </div>
        </section>
      )}

      {/* ARTICLE GRID */}
      <section className="relative bg-[#F7F6F3] py-10 px-6 overflow-hidden">
        <Frags s="left" /><Frags s="right" />
        <div className="max-w-[1080px] mx-auto relative z-10">
          <Lbl>● ALL ARTICLES</Lbl>
          <AnimatePresence mode="wait">
            {filtered.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-16 text-[#6B6778] text-[17px]">No articles in this category yet. Check back soon.</motion.div>
            ) : (
              <motion.div key="grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
                {filtered.map((p, i) => <motion.div key={p.id} initial={{ opacity: 0, y: 24, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: .4, delay: i * .07 }}><ArticleCard post={p} /></motion.div>)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <Divider />

      {/* AUTHORS */}
      <section className="py-14 bg-white px-6">
        <FadeUp className="text-center mb-10">
          <Lbl>● THE AUTHORS</Lbl>
          <h2 className="fb font-bold text-[clamp(32px,4vw,44px)] text-[#16141A] mt-3 tracking-[-0.025em]">Written by builders.</h2>
          <p className="text-[17px] text-[#6B6778] mt-4 max-w-[440px] mx-auto leading-relaxed">Every article is written by a member of the Merge Conflict team — engineers who built what they write about.</p>
        </FadeUp>
        <div className="max-w-[860px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: 'Rishabh Kumar Jha', initials: 'RKJ', role: 'Team Leader', ring: '#1A7F3C', badge: { bg: '#DCFCE7', c: '#1A7F3C', t: 'Team Leader' }, count: 4, bio: 'Building the tools I always wished I had as an engineer.' },
            { name: 'Parinita Tiwari', initials: 'PT', role: 'Core Member', ring: '#1A56DB', badge: { bg: '#EFF6FF', c: '#1A56DB', t: 'Core Member' }, count: 3, bio: 'Writing about the intersection of AI and developer experience.' },
            { name: 'Harsh Singhal', initials: 'HS', role: 'Core Member', ring: '#6D28D9', badge: { bg: '#F5F3FF', c: '#6D28D9', t: 'Core Member' }, count: 2, bio: 'Deep dives into the systems that power Velocis.' },
          ].map((a, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .6, delay: i * .15 }} whileHover={{ y: -6, boxShadow: '0 20px 56px rgba(22,20,26,0.10)', borderColor: 'rgba(26,127,60,0.2)' }} className="bg-[#F7F6F3] border border-[#E8E5DF] rounded-[20px] p-7 text-center cursor-default">
              <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center fb font-bold text-[22px] text-[#F0F6FC] relative" style={{ background: 'linear-gradient(135deg,#1C1A28,#2A2838)', boxShadow: `0 0 0 3px white,0 0 0 6px ${a.ring}` }}>
                {a.initials}
                <div className="absolute bottom-0 right-1 w-3 h-3 rounded-full bg-[#22C55E] border-2 border-white animate-[pr_2s_infinite]" />
              </div>
              <h4 className="font-bold text-[16px] text-[#16141A] mt-4">{a.name}</h4>
              <span className="fm text-[10px] px-3 py-1 rounded-full inline-block mt-1" style={{ background: a.badge.bg, color: a.badge.c }}>{a.badge.t}</span>
              <p className="fm text-[11px] text-[#9B97A8] mt-2">{a.count} articles</p>
              <div className="h-[1px] bg-[#E8E5DF] my-4" />
              <p className="fb italic text-[13px] text-[#6B6778] leading-[1.65]">"{a.bio}"</p>
              <button onClick={() => setActiveCategory('All')} className="mt-4 font-semibold text-[13px] text-[#1A7F3C] inline-flex items-center gap-1 group/l">View articles <ArrowRight size={13} className="group-hover/l:translate-x-1 transition-transform" /></button>
            </motion.div>
          ))}
        </div>
      </section>

      <Divider />

      {/* NEWSLETTER */}
      <section className="relative py-14 bg-[#F7F6F3] overflow-hidden px-6">
        <CircuitBg />
        <div className="relative z-10 max-w-[560px] mx-auto">
          <FadeUp className="text-center mb-8">
            <Lbl>● STAY UPDATED</Lbl>
            <h2 className="fb font-bold text-[clamp(32px,4vw,40px)] text-[#16141A] mt-3">Engineering insights, delivered.</h2>
            <p className="text-[16px] text-[#6B6778] mt-4 max-w-[460px] mx-auto leading-relaxed">New articles every week on AI developer tools, AWS architecture, and the future of software engineering.</p>
          </FadeUp>
          <FadeUp delay={0.1}>
            <div className="bg-white border border-[#E8E5DF] rounded-[16px] p-8 shadow-[0_4px_24px_rgba(22,20,26,0.06)]">
              <div className="flex justify-center gap-8 mb-6">
                {[{ icon: <BookOpen size={15} />, t: 'Weekly' }, { icon: <Shield size={15} />, t: 'No spam' }, { icon: <Check size={15} />, t: 'Unsubscribe anytime' }].map((x, i) => <span key={i} className="flex items-center gap-1.5 text-[13px] text-[#6B6778]"><span className="text-[#1A7F3C]">{x.icon}</span>{x.t}</span>)}
              </div>
              <AnimatePresence mode="wait">
                {subStatus === 'done' ? (
                  <motion.div key="done" initial={{ opacity: 0, scale: .95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
                    <div className="w-12 h-12 rounded-full bg-[#DCFCE7] flex items-center justify-center mx-auto mb-3"><Check size={22} className="text-[#1A7F3C]" /></div>
                    <p className="fb font-bold text-[18px] text-[#16141A]">You're on the list!</p>
                    <p className="text-[14px] text-[#6B6778] mt-1">Expect great content in your inbox.</p>
                  </motion.div>
                ) : (
                  <motion.div key="form" className="flex gap-3">
                    <div className="relative flex-1">
                      <input type="email" placeholder="your@email.com" value={newsletterEmail} onChange={e => setNewsletterEmail(e.target.value)} className="w-full bg-[#F7F6F3] border border-[#E8E5DF] rounded-[8px] px-4 py-3 text-[15px] text-[#16141A] placeholder-[#9B97A8] outline-none focus:border-[#1A7F3C] focus:ring-[3px] focus:ring-[rgba(26,127,60,0.1)] focus:bg-white transition-all" />
                      {newsletterEmail.includes('@') && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1A7F3C]"><Check size={15} strokeWidth={3} /></motion.div>}
                    </div>
                    <motion.button onClick={subscribe} whileHover={{ y: -1, backgroundColor: '#1A7F3C', boxShadow: '0 6px 18px rgba(26,127,60,0.28)' }} className="bg-[#16141A] text-white px-5 py-3 rounded-[8px] font-semibold text-[14px] whitespace-nowrap transition-colors">
                      {subStatus === 'busy' ? <div className="flex gap-1">{[0, 1, 2].map(i => <motion.div key={i} animate={{ opacity: [.3, 1, .3] }} transition={{ duration: .6, repeat: Infinity, delay: i * .2 }} className="w-1.5 h-1.5 bg-white rounded-full" />)}</div> : 'Subscribe'}
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
              <p className="fm text-[11px] text-[#9B97A8] text-center mt-4">Join engineers already reading</p>
            </div>
          </FadeUp>
        </div>
      </section>

      <Divider />

      {/* RELATED READING */}
      <section className="bg-white py-12 px-6">
        <FadeUp className="text-center mb-8">
          <Lbl>● FROM THE TEAM</Lbl>
          <h2 className="fb font-bold text-[clamp(28px,3.5vw,40px)] text-[#16141A] mt-3">More from Velocis.</h2>
        </FadeUp>
        <div className="max-w-[900px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { icon: <Info size={22} />, title: 'Read our story', body: 'Learn how we built Velocis and why we believe every developer deserves a senior engineer.', link: 'Visit About page', href: '/about' },
            { icon: <Users size={22} />, title: 'We are hiring', body: 'Three open roles on the Velocis team. Build what you read about.', link: 'See open roles', href: '/careers' },
            { icon: <Shield size={22} />, title: 'How we handle security', body: 'Our read-only OAuth model, AWS infrastructure, and responsible disclosure policy.', link: 'Security overview', href: '/security' },
          ].map((c, i) => (
            <motion.a key={i} href={c.href} target="_blank" rel="noopener noreferrer" onClick={(e) => { if (c.href.startsWith('/')) { e.preventDefault(); window.open(c.href, '_blank', 'noopener,noreferrer'); } }} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .5, delay: i * .1 }} whileHover={{ y: -3, boxShadow: '0 8px 28px rgba(22,20,26,0.08)', borderColor: 'rgba(26,127,60,0.25)' }} className="bg-[#F7F6F3] border border-[#E8E5DF] rounded-[14px] p-6 flex items-start gap-4 group">
              <div className="w-12 h-12 rounded-full bg-[#F0FDF4] border border-[rgba(26,127,60,0.12)] flex items-center justify-center text-[#1A7F3C] flex-shrink-0 group-hover:bg-[#DCFCE7] transition-colors">{c.icon}</div>
              <div><h4 className="font-bold text-[15px] text-[#16141A] mb-1">{c.title}</h4><p className="text-[13px] text-[#6B6778] leading-relaxed mb-3">{c.body}</p><span className="font-semibold text-[13px] text-[#1A7F3C] inline-flex items-center gap-1 group/l">{c.link}<ArrowRight size={13} className="group-hover/l:translate-x-1 transition-transform" /></span></div>
            </motion.a>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-16 bg-[#F7F6F3] overflow-hidden px-6">
        {[{ c: 'rgba(26,127,60,0.14)', d: 12, s: 280, x: '10%', y: '20%' }, { c: 'rgba(46,164,79,0.11)', d: 15, s: 360, x: '70%', y: '10%' }, { c: 'rgba(63,185,80,0.09)', d: 18, s: 320, x: '80%', y: '60%' }, { c: 'rgba(22,163,74,0.07)', d: 14, s: 260, x: '20%', y: '70%' }].map((o, i) => (
          <motion.div key={i} animate={{ x: [0, 40, -40, 0], y: [0, -25, 25, 0] }} transition={{ duration: o.d, repeat: Infinity, ease: 'easeInOut' }} className="absolute rounded-full blur-[80px] pointer-events-none" style={{ backgroundColor: o.c, width: o.s, height: o.s, left: o.x, top: o.y }} />
        ))}
        <div className="relative z-10 max-w-[800px] mx-auto">
          <div className="text-center mb-10">
            <h2 className="fb font-bold text-[clamp(36px,4.5vw,52px)] text-[#16141A] tracking-[-0.03em]">Stop reading. Start shipping.</h2>
            <p className="text-[17px] text-[#6B6778] max-w-[420px] mx-auto mt-4 leading-relaxed">Connect Velocis to your GitHub and let Sentinel, Fortress, and Visual Cortex do the work you just read about.</p>
          </div>
          <div className="flex flex-col md:flex-row gap-5">
            <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: .7 }} className="flex-1 bg-[#16141A] rounded-[16px] p-7 relative overflow-hidden border border-[#2A2838]">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle,rgba(26,127,60,0.4)_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />
              <h3 className="fb font-bold text-[22px] text-white mb-3">Connect your repository.</h3>
              <p className="text-[14px] text-[#9B97A8] mb-6 leading-relaxed">OAuth only. Read-only. No setup. Sentinel starts reviewing your next pull request automatically.</p>
              <motion.button whileHover={{ y: -2, backgroundColor: '#22863A', boxShadow: '0 8px 24px rgba(46,164,79,.35)' }} className="bg-[#2EA44F] text-white px-6 py-3 rounded-[8px] font-semibold text-[14px] flex items-center gap-2 transition-colors">Connect with GitHub <ArrowUpRight size={15} /></motion.button>
              <div className="mt-5 flex gap-4 text-[12px] text-[#6B6778] flex-wrap">
                <span className="flex items-center gap-1.5"><Check size={12} className="text-[#2EA44F]" />Read-only</span>
                <span className="flex items-center gap-1.5"><Check size={12} className="text-[#2EA44F]" />No code changes</span>
                <span className="flex items-center gap-1.5"><Check size={12} className="text-[#2EA44F]" />Revoke anytime</span>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: .7, delay: .15 }} className="flex-1 bg-white border border-[#E8E5DF] rounded-[16px] p-7 group">
              <div className="w-10 h-10 bg-[#F0FDF4] border border-[#DCFCE7] rounded-[10px] flex items-center justify-center fb font-bold text-[18px] text-[#1A7F3C] mb-5 group-hover:rotate-[4deg] group-hover:scale-[1.06] transition-transform">V</div>
              <h3 className="fb font-bold text-[22px] text-[#16141A] mb-3">Subscribe to the blog.</h3>
              <p className="text-[14px] text-[#6B6778] mb-5 leading-relaxed">Get new articles delivered to your inbox every week. Engineering insights, product updates, and deep technical dives.</p>
              <div className="flex gap-2">
                <input type="email" placeholder="your@email.com" value={cta2Email} onChange={e => setCta2Email(e.target.value)} className="flex-1 bg-[#F7F6F3] border border-[#E8E5DF] rounded-[8px] px-3 py-2.5 text-[14px] text-[#16141A] placeholder-[#9B97A8] outline-none focus:border-[#1A7F3C] focus:ring-[3px] focus:ring-[rgba(26,127,60,0.1)] transition-all" />
                <motion.button whileHover={{ backgroundColor: '#1A7F3C' }} className="bg-[#16141A] text-white px-4 py-2.5 rounded-[8px] font-semibold text-[13px] transition-colors">Subscribe</motion.button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#E8E5DF] py-10 px-8 bg-white">
        <div className="max-w-[1080px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-[#9B97A8] text-[14px]">
          <div className="flex items-baseline gap-4"><span className="fb font-bold text-[19px] text-[#16141A]">Velocis.</span><span>© 2025 Velocis · Built by <span className="text-[#16141A] font-semibold">Merge Conflict</span></span></div>
          <div className="flex gap-7 font-medium">{[['About Us', '/about'], ['Blog', '/blog'], ['Security', '/security'], ['GitHub', '#']].map(([l, href]) => <a key={l} href={href} target="_blank" rel="noopener noreferrer" className="hover:text-[#16141A] transition-colors" onClick={(e) => { if (href.startsWith('/')) { e.preventDefault(); window.open(href, '_blank', 'noopener,noreferrer'); } }}>{l}</a>)}</div>
        </div>
      </footer>

      <Modal />
    </div>
  );
}