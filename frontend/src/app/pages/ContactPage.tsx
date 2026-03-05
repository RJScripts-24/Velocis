"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import { useNavigate } from 'react-router';
import { Mail, Github, MessageCircle, Copy, Check, ChevronDown, ExternalLink, Send, Shield, Lock, ArrowUpRight } from 'lucide-react';

interface FormState { name: string; email: string; subject: string; message: string; githubUrl: string; }
interface FormErrors { name?: string; email?: string; subject?: string; message?: string; }
type SubmitStatus = 'idle' | 'sending' | 'sent' | 'error';

const GStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
    :root{--g:#1A7F3C;--gb:#2EA44F;--dk:#16141A;--s:#6B6778;--m:#9B97A8;--bd:#E8E5DF;--b2:#F7F6F3;}
    *{box-sizing:border-box;}
    html{scroll-behavior:smooth;}
    body{font-family:'Inter',sans-serif;background:#fff;color:#16141A;font-feature-settings:"kern"1,"liga"1,"calt"1;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased;}
    ::selection{background:rgba(26,127,60,0.15);color:#16141A;}
    .fb{font-family:'Libre Baskerville',serif;}
    .fm{font-family:'JetBrains Mono',monospace;}
    button:focus-visible,a:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:2px solid var(--g);outline-offset:3px;}
    @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;}}
    @keyframes blink{50%{opacity:0;}}
    @keyframes breathe{0%,100%{transform:scale(.95);opacity:.5;}50%{transform:scale(1.05);opacity:1;}}
    @keyframes pr{0%{box-shadow:0 0 0 0 rgba(26,127,60,.4);}70%{box-shadow:0 0 0 8px rgba(26,127,60,0);}100%{box-shadow:0 0 0 0 rgba(26,127,60,0);}}`}
  </style>
);

const ProgBar = () => {
  const { scrollYProgress } = useScroll();
  const sx = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  return <motion.div style={{ scaleX: sx }} className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#1A7F3C] to-[#3FB950] origin-left z-[9999]"><div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-1 bg-[#3FB950] rounded-full shadow-[0_0_6px_#3FB950]" /></motion.div>;
};

const Grain = () => <div style={{ position: 'fixed', inset: 0, zIndex: 999, pointerEvents: 'none', opacity: .04, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />;

const Canvas = () => {
  const cr = useRef<HTMLCanvasElement>(null), rf = useRef(0);
  useEffect(() => {
    const c = cr.current; if (!c) return;
    const ctx = c.getContext('2d')!;
    const rs = () => { c.width = c.offsetWidth; c.height = c.offsetHeight; };
    rs(); window.addEventListener('resize', rs);
    const ns = Array.from({ length: 55 }, () => ({ x: Math.random() * c.width, y: Math.random() * c.height, vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4, pulse: 0, pDir: 0 }));
    let pt = 0;
    const draw = (t: number) => {
      if (document.hidden) { rf.current = requestAnimationFrame(draw); return; }
      ctx.clearRect(0, 0, c.width, c.height); pt++;
      if (pt > 180) { const n = ns[Math.floor(Math.random() * ns.length)]; n.pDir = 1; pt = 0; }
      ns.forEach((n, i) => {
        if (n.pDir === 1) { n.pulse += .15; if (n.pulse >= 1) n.pDir = -1; }
        else if (n.pDir === -1) { n.pulse -= .15; if (n.pulse <= 0) { n.pulse = 0; n.pDir = 0; } }
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > c.width) n.vx *= -1;
        if (n.y < 0 || n.y > c.height) n.vy *= -1;
        ns.slice(i + 1).forEach(m => {
          const d = Math.hypot(n.x - m.x, n.y - m.y);
          if (d < 140) { ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y); ctx.strokeStyle = `rgba(26,127,60,${.12 * (1 - d / 140)})`; ctx.lineWidth = 1; ctx.stroke(); }
        });
        const pr = 1.5 + n.pulse * 3;
        ctx.beginPath(); ctx.arc(n.x, n.y, pr, 0, Math.PI * 2);
        if (n.pulse > 0) { ctx.shadowBlur = 16; ctx.shadowColor = `rgba(46,164,79,${n.pulse * .28})`; } else ctx.shadowBlur = 0;
        ctx.fillStyle = n.pulse > 0 ? `rgba(46,164,79,${.18 + n.pulse * .2})` : 'rgba(26,127,60,0.18)';
        ctx.fill();
      });
      rf.current = requestAnimationFrame(draw);
    };
    rf.current = requestAnimationFrame(draw);
    return () => { window.removeEventListener('resize', rs); cancelAnimationFrame(rf.current); };
  }, []);
  return <canvas ref={cr} className="absolute inset-0 w-full h-full pointer-events-none" />;
};

const Lbl = ({ children, pill, color = '#1A7F3C' }: { children: React.ReactNode; pill?: boolean; color?: string }) => (
  <div className={`fm uppercase text-[11px] tracking-[0.14em] inline-block${pill ? ' border border-[rgba(26,127,60,0.3)] bg-[rgba(26,127,60,0.05)] rounded-full px-4 py-1.5' : ''}`} style={{ color }}>{children}</div>
);

const Nav = () => {
  const navigate = useNavigate();
  const [sc, setSc] = useState(false);
  useEffect(() => { const h = () => setSc(window.scrollY > 80); window.addEventListener('scroll', h); return () => window.removeEventListener('scroll', h); }, []);
  return (
    <motion.nav initial={{ y: -60, opacity: 0 }} animate={{ y: sc ? 0 : -60, opacity: sc ? 1 : 0 }} className="fixed top-0 left-0 right-0 h-[60px] z-[5000] px-8 flex items-center justify-between border-b border-[#E8E5DF] bg-[rgba(255,255,255,0.92)] backdrop-blur-[16px]" style={{ boxShadow: sc ? '0 1px 0 rgba(22,20,26,0.08)' : 'none' }}>
      <div className="flex items-center gap-2"><span className="fb font-bold text-[18px]">Velocis.</span><div className="w-[2px] h-[13px] bg-[#1A7F3C] animate-[blink_1.1s_step-end_infinite]" /></div>
      <div className="hidden md:flex items-center gap-8 font-[500] text-[14px] text-[#4B4856]">
        {[['About', '/about'], ['Careers', '/careers'], ['Contact', '/contact']].map(([x, href]) => (
          <a key={x} href={href} target="_blank" rel="noopener noreferrer" className={`relative group transition-colors ${x === 'Contact' ? 'text-[#16141A] font-semibold' : 'hover:text-[#16141A]'}`} onClick={(e) => { if (href.startsWith('/')) { e.preventDefault(); window.open(href, '_blank', 'noopener,noreferrer'); } }}>\n            {x}<span className={`absolute -bottom-1 left-0 w-full h-[1px] bg-[#1A7F3C] origin-left transition-transform duration-200 ${x === 'Contact' ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />
          </a>
        ))}
      </div>
      <motion.button whileHover={{ y: -1, backgroundColor: '#1A7F3C', boxShadow: '0 4px 12px rgba(26,127,60,0.25)' }} transition={{ type: 'spring', stiffness: 400, damping: 10 }} className="bg-[#16141A] text-white px-[18px] py-[9px] rounded-[8px] font-semibold text-[13px]">Connect GitHub</motion.button>
    </motion.nav>
  );
};

const Hero = () => (
  <section className="relative pt-14 pb-12 bg-white overflow-hidden text-center px-6">
    <Canvas />
    <div className="absolute inset-0 pointer-events-none animate-[breathe_9s_ease-in-out_infinite] bg-[radial-gradient(ellipse_600px_280px_at_50%_50%,rgba(26,127,60,0.04)_0%,transparent_70%)]" />
    <div className="relative z-10 max-w-[640px] mx-auto">
      <motion.div initial={{ scale: .85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }} className="mb-3"><Lbl pill>GET IN TOUCH</Lbl></motion.div>
      <h1 className="fb font-bold text-[56px] leading-[1.08] tracking-[-0.03em] text-[#16141A]">
        {"Let's talk.".split(' ').map((w, i) => (
          <span key={i} className="inline-block overflow-hidden align-bottom mr-[0.2em]">
            <motion.span initial={{ y: '110%', filter: 'blur(8px)' }} animate={{ y: 0, filter: 'blur(0)' }} transition={{ duration: .65, delay: .1 + i * .055, ease: [.22, 1, .36, 1] }} className="inline-block">{w}</motion.span>
          </span>
        ))}
      </h1>
      <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .4, duration: .6 }} className="text-[17px] text-[#6B6778] leading-[1.68] mt-4 max-w-[460px] mx-auto">Whether you want to connect your repo, explore a partnership, or just ask a question, we read and respond to every message.</motion.p>
      <div className="flex flex-wrap justify-center gap-3 mt-6">
        {[{ t: '48h response time', a: true }, { t: 'Remote team', a: false }, { t: 'No spam. Ever.', a: false }].map((x, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .6 + i * .1 }} className={`fm text-[12px] px-4 py-1.5 border rounded-full ${x.a ? 'border-[rgba(26,127,60,0.3)] text-[#1A7F3C] animate-[pr_2s_infinite]' : 'border-[#E8E5DF] text-[#6B6778]'}`}>{x.t}</motion.div>
        ))}
      </div>
    </div>
  </section>
);

const Frags = ({ s }: { s: 'left' | 'right' }) => {
  const fs = s === 'left' ? ['await message.send()', 'form.validate()', 'status: 200 OK', 'response.success()', 'ping pong'] : ['reply within 48h', 'team.notify(msg)', 'inbox.push(contact)', 'const reply = true', 'connected'];
  return (
    <div className={`fixed top-0 bottom-0 ${s === 'left' ? 'left-4' : 'right-4'} w-36 pointer-events-none hidden xl:flex flex-col justify-around z-0`}>
      {fs.map((f, i) => <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: .2, x: s === 'left' ? [0, 6, 0] : [0, -6, 0], y: [0, -14, 0] }} transition={{ duration: 6 + i * 1.2, delay: i * 1.1, repeat: Infinity, ease: 'easeInOut' }} className="fm text-[11px] text-[#1A7F3C] whitespace-nowrap">{f}</motion.div>)}
    </div>
  );
};

const ipt = "w-full bg-[#FAFAF8] border border-[#E8E5DF] rounded-[8px] px-4 py-3 text-[#16141A] outline-none focus:border-[#1A7F3C] focus:bg-white focus:ring-[3px] focus:ring-[rgba(26,127,60,0.1)] transition-all text-[15px] font-['Inter']";

const Form = () => {
  const [f, setF] = useState<FormState>({ name: '', email: '', subject: '', message: '', githubUrl: '' });
  const [e, setE] = useState<FormErrors>({});
  const [st, setSt] = useState<SubmitStatus>('idle');
  const vld = (n: keyof FormState, v: string) => {
    let err = '';
    if (n === 'name' && v.trim().length <= 1) err = 'Name is too short';
    if (n === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) err = 'Invalid email address';
    if (n === 'message' && v.trim().length <= 10) err = 'Please provide more detail';
    if (n === 'subject' && !v) err = 'Please select a subject';
    setE(p => ({ ...p, [n]: err }));
  };
  const ok = !!(f.name && f.email && f.subject && f.message && !Object.values(e).some(x => x));
  const sub = (ev: React.FormEvent) => { ev.preventDefault(); if (!ok || st === 'sending') return; setSt('sending'); setTimeout(() => setSt('sent'), 1200); };
  return (
    <motion.div initial={{ opacity: 0, x: -32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: .7, delay: .2 }} className="relative bg-white border border-[#E8E5DF] rounded-[16px] p-10 shadow-[0_2px_8px_rgba(22,20,26,0.04),0_8px_32px_rgba(22,20,26,0.06)]">
      <AnimatePresence mode="wait">
        {st === 'sent' && <motion.div key="ok" initial={{ opacity: 0, scale: .95 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 z-20 bg-white/95 flex flex-col items-center justify-center text-center p-8 rounded-[16px]">
          <div className="w-16 h-16 rounded-full border-2 border-[#1A7F3C] flex items-center justify-center mb-6">
            <motion.svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1A7F3C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><motion.polyline points="20 6 9 17 4 12" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: .5, delay: .2 }} /></motion.svg>
          </div>
          <h3 className="fb font-bold text-[24px] text-[#16141A]">Message sent!</h3>
          <p className="text-[#6B6778] mt-2 mb-8 text-[15px]">We'll get back to you within 48 hours.</p>
          <button onClick={() => { setF({ name: '', email: '', subject: '', message: '', githubUrl: '' }); setSt('idle'); setE({}); }} className="text-[#1A7F3C] font-semibold hover:underline">Send another message</button>
        </motion.div>}
      </AnimatePresence>
      <div className={st === 'sent' ? 'opacity-30 pointer-events-none' : ''}>
        <Lbl>SEND A MESSAGE</Lbl>
        <h3 className="fb font-bold text-[26px] text-[#16141A] mt-1.5">We'd love to hear from you.</h3>
        <div className="h-[1px] bg-[#E8E5DF] my-6" />
        <form onSubmit={sub} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block font-semibold text-[13px] text-[#16141A] mb-1.5">Name</label>
              <div className="relative"><input type="text" placeholder="Your name" className={ipt} value={f.name} onChange={ev => { setF({ ...f, name: ev.target.value }); vld('name', ev.target.value); }} onBlur={ev => vld('name', ev.target.value)} />
                {f.name && !e.name && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1A7F3C] pointer-events-none"><Check size={15} strokeWidth={3} /></motion.div>}
              </div>
              {e.name && <p className="text-[12px] text-[#DC2626] italic mt-1 px-1">{e.name}</p>}
            </div>
            <div>
              <label className="block font-semibold text-[13px] text-[#16141A] mb-1.5">Email</label>
              <div className="relative"><input type="email" placeholder="you@example.com" className={`${ipt} ${e.email ? 'border-[#DC2626]' : ''}`} value={f.email} onChange={ev => { setF({ ...f, email: ev.target.value }); vld('email', ev.target.value); }} onBlur={ev => vld('email', ev.target.value)} />
                {f.email && !e.email && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1A7F3C] pointer-events-none"><Check size={15} strokeWidth={3} /></motion.div>}
              </div>
              {e.email && <p className="text-[12px] text-[#DC2626] italic mt-1 px-1">{e.email}</p>}
            </div>
          </div>
          <div>
            <label className="block font-semibold text-[13px] text-[#16141A] mb-1.5">What's this about?</label>
            <div className="relative group">
              <select className={`${ipt} appearance-none cursor-pointer`} value={f.subject} onChange={ev => { setF({ ...f, subject: ev.target.value }); vld('subject', ev.target.value); }}>
                <option value="">Select an option...</option>
                <option value="GitHub">Connect my GitHub repository</option>
                <option value="Partnership">Partnership or collaboration</option>
                <option value="Press">Press or media inquiry</option>
                <option value="General">General question</option>
                <option value="Other">Something else</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9B97A8] pointer-events-none group-focus-within:rotate-180 transition-transform" size={17} />
            </div>
          </div>
          <div>
            <label className="block font-semibold text-[13px] text-[#16141A] mb-1.5">GitHub repo URL <span className="text-[#9B97A8] font-normal italic">(optional)</span></label>
            <div className="relative"><div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9B97A8]"><Github size={15} /></div>
              <input type="text" placeholder="https://github.com/yourname/repo" className={`${ipt} pl-10`} value={f.githubUrl} onChange={ev => setF({ ...f, githubUrl: ev.target.value })} />
            </div>
          </div>
          <div>
            <label className="block font-semibold text-[13px] text-[#16141A] mb-1.5">Your message</label>
            <div className="relative">
              <textarea placeholder="Tell us how we can help..." className={`${ipt} min-h-[140px] resize-y`} value={f.message} onChange={ev => { if (ev.target.value.length <= 500) { setF({ ...f, message: ev.target.value }); vld('message', ev.target.value); } }} onBlur={ev => vld('message', ev.target.value)} />
              <div className="absolute bottom-3 right-3 fm text-[10px] pointer-events-none tabular-nums" style={{ color: f.message.length >= 480 ? '#DC2626' : f.message.length >= 400 ? '#EA580C' : '#9B97A8' }}>{f.message.length} / 500</div>
            </div>
            {e.message && <p className="text-[12px] text-[#DC2626] italic mt-1 px-1">{e.message}</p>}
          </div>
          <motion.button type="submit" disabled={!ok || st === 'sending'} whileHover={ok ? { y: -2, backgroundColor: '#1A7F3C', boxShadow: '0 8px 24px rgba(26,127,60,.30)' } : {}} whileTap={ok ? { scale: .98 } : {}} className={`w-full h-[52px] rounded-[10px] font-semibold text-[16px] flex items-center justify-center gap-2 overflow-hidden group/btn transition-all ${ok ? 'bg-[#16141A] text-white' : 'bg-[#E8E5DF] text-[#9B97A8] cursor-not-allowed'}`}>
            {st === 'sending' ? <div className="flex gap-2">{[0, 1, 2].map(i => <motion.div key={i} animate={{ opacity: [.3, 1, .3], scale: [.8, 1.1, .8] }} transition={{ duration: .8, repeat: Infinity, delay: i * .2 }} className="w-2 h-2 bg-white rounded-full" />)}</div> : <>Send Message <Send size={16} className="group-hover/btn:translate-x-1 transition-transform" /></>}
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
};

const Info = () => {
  const [cp, setCp] = useState(false);
  const copy = () => { navigator.clipboard.writeText('team@velocis.dev'); setCp(true); setTimeout(() => setCp(false), 2000); };
  return (
    <motion.div initial={{ opacity: 0, x: 32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: .7, delay: .35 }} className="flex flex-col gap-8">
      <div>
        <Lbl>DIRECT</Lbl><h4 className="fb font-bold text-[20px] text-[#16141A] mt-1.5">Reach us directly.</h4>
        <p className="text-[15px] text-[#6B6778] mt-1 mb-4 leading-relaxed">Prefer email? We read everything personally and respond within two business days.</p>
        <div className="flex flex-col gap-3">
          <div className="bg-[#F7F6F3] rounded-[10px] p-4 flex items-center justify-between group relative overflow-hidden">
            <div className="flex items-center gap-3 relative z-10"><Mail size={17} className="text-[#1A7F3C]" /><span className="font-semibold text-[14px] text-[#16141A]">team@velocis.dev</span></div>
            <button onClick={copy} className="relative z-10 p-2 text-[#9B97A8] hover:text-[#1A7F3C] transition-colors rounded-md hover:bg-[#E8E5DF]">
              <AnimatePresence>{cp && <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute -top-9 left-1/2 -translate-x-1/2 fm text-[10px] bg-[#16141A] text-white px-3 py-1 rounded shadow-xl whitespace-nowrap">Copied!</motion.span>}</AnimatePresence>
              {cp ? <Check size={16} className="text-[#1A7F3C]" /> : <Copy size={16} />}
            </button>
            <div className="absolute inset-0 bg-[#F0FDF4] -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-out" />
          </div>
          <a href="https://github.com/velocis-ai" target="_blank" rel="noopener noreferrer" className="bg-[#F7F6F3] rounded-[10px] p-4 flex items-center justify-between group relative overflow-hidden">
            <div className="flex items-center gap-3 relative z-10"><Github size={17} className="text-[#16141A]" /><span className="font-semibold text-[14px] text-[#16141A]">github.com/velocis</span></div>
            <ExternalLink size={16} className="text-[#9B97A8] group-hover:text-[#16141A] transition-colors relative z-10" />
            <div className="absolute inset-0 bg-[#EFF6FF] -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-out" />
          </a>
        </div>
      </div>
      <div className="h-[1px] bg-[#E8E5DF]" />
      <div>
        <Lbl>RESPONSE TIME</Lbl><h4 className="fb font-bold text-[20px] text-[#16141A] mt-1.5">We actually reply.</h4>
        <div className="mt-4 space-y-3">
          {[{ d: '#1A7F3C', l: 'General inquiries', v: 'Within 48 hours' }, { d: '#1A56DB', l: 'Partnership requests', v: 'Within 5 business days' }, { d: '#6D28D9', l: 'GitHub connection help', v: 'Same business day' }].map((r, i) => (
            <div key={i} className="flex items-center justify-between border-b border-[#F7F6F3] pb-2.5"><div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full" style={{ background: r.d }} /><span className="font-semibold text-[13px] text-[#16141A]">{r.l}</span></div><span className="text-[13px] text-[#6B6778]">{r.v}</span></div>
          ))}
        </div>
      </div>
      <div className="h-[1px] bg-[#E8E5DF]" />
      <div>
        <Lbl>THE TEAM</Lbl><h4 className="fb font-bold text-[20px] text-[#16141A] mt-1.5">Who you'll hear from.</h4>
        <div className="mt-4 flex flex-col gap-1">
          {[{ n: 'Rishabh Kumar Jha', r: 'Team Leader', i: 'RKJ', c: '#1A7F3C' }, { n: 'Parinita Tiwari', r: 'Core Member', i: 'PT', c: '#1A56DB' }, { n: 'Harsh Singhal', r: 'Core Member', i: 'HS', c: '#6D28D9' }].map((m, i) => (
            <motion.div key={i} whileHover={{ x: 4 }} className="flex items-center gap-4 p-2.5 rounded-lg hover:bg-[#F7F6F3] transition-colors cursor-default">
              <div className="w-[44px] h-[44px] rounded-full flex items-center justify-center fb font-bold text-[13px] text-[#F0F6FC] flex-shrink-0" style={{ background: 'linear-gradient(135deg,#1C1A28,#2A2838)', boxShadow: `0 0 0 2px white,0 0 0 4px ${m.c}` }}>{m.i}</div>
              <div><div className="font-semibold text-[13px] text-[#16141A]">{m.n}</div><div className="fm text-[11px] text-[#9B97A8]">{m.r}</div></div>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="h-[1px] bg-[#E8E5DF]" />
      <div>
        <Lbl>BUILT WITH</Lbl>
        <div className="flex flex-wrap gap-2 mt-4">
          {['AWS Bedrock', 'Claude 3.5', 'Next.js', 'TypeScript'].map(b => <motion.div key={b} whileHover={{ backgroundColor: '#1A7F3C' }} className="bg-[#16141A] text-[#E6EDF3] fm text-[11px] px-3 py-1.5 rounded-full cursor-default transition-colors">{b}</motion.div>)}
        </div>
      </div>
    </motion.div>
  );
};

const CircuitBg = () => {
  const r1 = useRef<SVGPathElement>(null), r2 = useRef<SVGPathElement>(null), sec = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sec.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        [r1.current, r2.current].forEach(p => {
          if (!p) return; const len = p.getTotalLength();
          p.style.strokeDasharray = `${len}`; p.style.strokeDashoffset = `${len}`;
          p.style.transition = 'stroke-dashoffset 3s ease'; requestAnimationFrame(() => { p.style.strokeDashoffset = '0'; });
        });
        obs.disconnect();
      }
    }, { threshold: 0.3 });
    obs.observe(el); return () => obs.disconnect();
  }, []);
  return (
    <div ref={sec} className="absolute inset-0 pointer-events-none overflow-hidden">
      <svg width="100%" height="100%" viewBox="0 0 1200 500" preserveAspectRatio="xMidYMid slice" className="absolute inset-0">
        {[[200, 80], [400, 80], [600, 200], [800, 80], [1000, 200]].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={4} fill="rgba(46,164,79,0.26)"><animate attributeName="r" values="4;7;4" dur={`${2 + i * .3}s`} repeatCount="indefinite" /><animate attributeName="opacity" values="0.26;0.35;0.26" dur={`${2 + i * .3}s`} repeatCount="indefinite" /></circle>
        ))}
        <path ref={r1} d="M 100 80 L 200 80 L 200 200 L 400 200 L 400 80 L 600 80 L 600 200 L 800 200 L 800 80 L 1000 80 L 1000 200" fill="none" stroke="rgba(26,127,60,0.16)" strokeWidth="1.2" />
        <path ref={r2} d="M 100 320 L 300 320 L 300 200 L 500 200 L 500 320 L 700 320 L 900 320 L 1100 320" fill="none" stroke="rgba(26,127,60,0.14)" strokeWidth="1.2" />
        <circle r="4" fill="rgba(63,185,80,0.55)"><animateMotion dur="6s" repeatCount="indefinite" path="M 100 80 L 200 80 L 200 200 L 400 200 L 400 80 L 600 80 L 600 200 L 800 200 L 800 80 L 1000 80 L 1000 200" /></circle>
      </svg>
    </div>
  );
};

const Methods = () => {
  const cards = [
    { title: 'Connect your repository', body: 'The fastest path to seeing Velocis in action. Connect via OAuth and Sentinel starts reviewing within minutes.', icon: <Github size={24} />, badge: 'RECOMMENDED', ac: '#1A7F3C', bg: '#F0FDF4', link: 'Connect GitHub', href: '/auth' },
    { title: 'Send us an email', body: 'Reach out directly at team@velocis.dev. We read every message personally and respond within 48 hours.', icon: <Mail size={24} />, badge: 'DIRECT', ac: '#1A56DB', bg: '#EFF6FF', link: 'team@velocis.dev', href: 'mailto:team@velocis.dev' },
    { title: 'GitHub Discussions', body: 'Open a discussion on our GitHub repository. Great for technical questions, feature requests, or bug reports.', icon: <MessageCircle size={24} />, badge: 'OPEN SOURCE', ac: '#6D28D9', bg: '#F5F3FF', link: 'Open a discussion', href: 'https://github.com/velocis-ai' },
  ];
  return (
    <section className="relative py-14 bg-[#F7F6F3] overflow-hidden">
      <CircuitBg />
      <div className="relative z-10 max-w-[960px] mx-auto px-6">
        <div className="text-center mb-8">
          <Lbl>● OTHER WAYS</Lbl>
          <h2 className="fb font-bold text-[clamp(32px,4vw,44px)] text-[#16141A] mt-3 tracking-[-0.025em]">Three ways to connect.</h2>
          <p className="text-[17px] text-[#6B6778] mt-4 max-w-[480px] mx-auto leading-relaxed">Pick whatever fits your workflow. We respond the same either way.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {cards.map((c, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 32, scale: .97 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: .7, delay: i * .12, ease: [.25, .1, .25, 1] }} whileHover={{ y: -6, borderColor: 'rgba(26,127,60,.25)', boxShadow: '0 0 0 4px rgba(26,127,60,.06),0 20px 48px rgba(22,20,26,.10)' }} className="bg-white border border-[#E8E5DF] rounded-[16px] p-6 relative group overflow-hidden cursor-pointer">
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[16px]" style={{ backgroundColor: c.ac }} />
              <div className="flex justify-between items-start mb-5">
                <div className="w-[52px] h-[52px] rounded-[12px] flex items-center justify-center border border-[rgba(26,127,60,0.15)] group-hover:scale-110 group-hover:rotate-[8deg] transition-transform duration-280" style={{ background: c.bg, color: c.ac }}>{c.icon}</div>
                <div className="fm text-[10px] px-2.5 py-0.5 rounded-full" style={{ background: c.bg, color: c.ac }}>{c.badge}</div>
              </div>
              <h4 className="fb font-bold text-[20px] text-[#16141A] mb-2">{c.title}</h4>
              <p className="text-[14px] text-[#6B6778] leading-[1.65] mb-5">{c.body}</p>
              <a href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="font-semibold text-[13px] group/l relative inline-block" style={{ color: c.ac }}>
                {c.link} <span className="inline-block transition-transform group-hover/l:translate-x-1">→</span>
                <span className="absolute -bottom-0.5 left-0 w-full h-[1px] bg-current scale-x-0 group-hover/l:scale-x-100 origin-left transition-transform duration-200" />
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Divider = () => (
  <div className="flex flex-col items-center gap-3 py-2 pointer-events-none opacity-20">
    <div className="w-px h-10 bg-gradient-to-b from-transparent via-[#E8E5DF] to-transparent" />
    <div className="flex gap-2">{[0, 1, 2].map(i => <div key={i} className="w-1 h-1 rounded-full bg-[#1A7F3C]" />)}</div>
  </div>
);

const FAQ = () => {
  const [op, setOp] = useState<number | null>(null);
  const qs = [
    { q: 'Is Velocis free to use?', a: 'Velocis is currently in active development as part of the Merge Conflict hackathon project. Reach out to discuss early access and pricing for your team.' },
    { q: 'Does Velocis store my code?', a: 'No. Velocis operates with read-only OAuth access and processes code in-memory using Amazon Bedrock. Nothing is stored beyond repository metadata and agent outputs.' },
    { q: 'Which programming languages does Velocis support?', a: 'Velocis currently has strongest support for TypeScript, JavaScript, and Python. Support for Go, Java, and Rust is on the roadmap.' },
    { q: 'How does the GitHub OAuth connection work?', a: 'You authorize Velocis via GitHub OAuth. We only request the minimum permissions required: reading repository contents and monitoring pull request events. You can revoke access at any time.' },
    { q: 'Can Velocis write code or make commits?', a: 'No. Velocis is strictly read-only. It reviews, suggests, tests, and documents, but never writes to your repository. You remain in full control.' },
    { q: 'How quickly does Sentinel review a pull request?', a: 'Sentinel typically completes a full semantic review within 60 to 90 seconds of a pull request being opened, depending on the size of the diff.' },
  ];
  return (
    <section className="py-14 bg-white px-6">
      <div className="max-w-[680px] mx-auto">
        <div className="text-center mb-8">
          <Lbl>● QUICK ANSWERS</Lbl>
          <h2 className="fb font-bold text-[clamp(32px,4vw,44px)] text-[#16141A] mt-3">Common questions.</h2>
          <p className="text-[17px] text-[#6B6778] mt-4 max-w-[480px] mx-auto leading-relaxed">Everything you need to know before reaching out.</p>
        </div>
        <div className="border-t border-[#E8E5DF]">
          {qs.map((x, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .5, delay: i * .07 }} className="border-b border-[#E8E5DF]">
              <button onClick={() => setOp(op === i ? null : i)} className="w-full py-5 flex items-center justify-between text-left group">
                <span className={`font-semibold text-[15px] transition-colors ${op === i ? 'text-[#1A7F3C]' : 'text-[#16141A] group-hover:text-[#1A7F3C]'}`}>{x.q}</span>
                <ChevronDown size={19} className={`text-[#9B97A8] transition-transform duration-250 flex-shrink-0 ml-4 ${op === i ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>{op === i && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: .3, ease: [.25, .1, .25, 1] }} className="overflow-hidden"><p className="text-[15px] text-[#6B6778] leading-[1.72] pb-5 max-w-[60ch]">{x.a}</p></motion.div>}</AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const CTA = () => (
  <section className="relative py-16 bg-[#F7F6F3] overflow-hidden">
    {[{ c: 'rgba(26,127,60,0.14)', d: 12, s: 280, x: '10%', y: '20%' }, { c: 'rgba(46,164,79,0.11)', d: 15, s: 360, x: '70%', y: '10%' }, { c: 'rgba(63,185,80,0.09)', d: 18, s: 320, x: '80%', y: '60%' }, { c: 'rgba(22,163,74,0.07)', d: 14, s: 260, x: '20%', y: '70%' }].map((o, i) => (
      <motion.div key={i} animate={{ x: [0, 40, -40, 0], y: [0, -25, 25, 0] }} transition={{ duration: o.d, repeat: Infinity, ease: 'easeInOut' }} className="absolute rounded-full blur-[80px] pointer-events-none" style={{ backgroundColor: o.c, width: o.s, height: o.s, left: o.x, top: o.y }} />
    ))}
    <div className="relative z-10 max-w-[800px] mx-auto px-6">
      <div className="text-center mb-10">
        <h2 className="fb font-bold text-[clamp(36px,4.5vw,52px)] text-[#16141A] tracking-[-0.03em]">Your repo is waiting.</h2>
        <p className="text-[17px] text-[#6B6778] max-w-[400px] mx-auto mt-4 leading-relaxed">Connect Velocis to your GitHub and watch Sentinel, Fortress, and Visual Cortex go to work. No manual setup. Just OAuth.</p>
      </div>
      <div className="flex flex-col md:flex-row gap-5">
        <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: .7 }} className="flex-1 bg-[#16141A] rounded-[16px] p-7 relative overflow-hidden group border border-[#2A2838]">
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle,rgba(26,127,60,0.4)_1px,transparent_1px)] [background-size:20px_20px]" />
          <h3 className="fb font-bold text-[22px] text-white mb-3">Start for free.</h3>
          <p className="text-[14px] text-[#9B97A8] mb-7 leading-relaxed">Connect your repository in under 60 seconds. Sentinel begins reviewing your next pull request automatically.</p>
          <motion.button whileHover={{ y: -2, backgroundColor: '#22863A', boxShadow: '0 8px 24px rgba(46,164,79,.35)' }} className="bg-[#2EA44F] text-white px-7 py-3 rounded-[8px] font-semibold text-[14px] flex items-center gap-2 group/b transition-colors">Connect with GitHub <ArrowUpRight size={15} className="group-hover/b:translate-x-0.5 group-hover/b:-translate-y-0.5 transition-transform" /></motion.button>
          <div className="mt-6 flex flex-wrap gap-4 text-[12px] text-[#6B6778]">
            <span className="flex items-center gap-1.5"><Check size={13} className="text-[#2EA44F]" />Read-only</span>
            <span className="flex items-center gap-1.5"><Shield size={13} className="text-[#2EA44F]" />No code changes</span>
            <span className="flex items-center gap-1.5"><Lock size={13} className="text-[#2EA44F]" />Secure OAuth</span>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: .7, delay: .15 }} className="flex-1 bg-white border border-[#E8E5DF] rounded-[16px] p-7 group">
          <div className="w-10 h-10 bg-[#F0FDF4] border border-[#DCFCE7] rounded-[10px] flex items-center justify-center fb font-bold text-[18px] text-[#1A7F3C] mb-5 group-hover:rotate-[4deg] group-hover:scale-[1.06] transition-transform">V</div>
          <h3 className="fb font-bold text-[22px] text-[#16141A] mb-3">Have more questions?</h3>
          <p className="text-[14px] text-[#6B6778] mb-7 leading-relaxed">Use the contact form above or email us directly. We respond personally to every message within 48 hours.</p>
          <a href="#" className="font-semibold text-[14px] text-[#16141A] flex items-center gap-1 group/l hover:text-[#1A7F3C] transition-colors inline-flex">Send a message <ArrowUpRight size={15} className="group-hover/l:translate-x-0.5 group-hover/l:-translate-y-0.5 transition-transform" /></a>
        </motion.div>
      </div>
    </div>
  </section>
);

const Foot = () => {
  const navigate = useNavigate();
  return (
    <footer className="border-t border-[#E8E5DF] py-12 px-8 bg-white">
      <div className="max-w-[1080px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-[#9B97A8] text-[14px]">
        <div className="flex items-baseline gap-4"><span className="fb font-bold text-[19px] text-[#16141A]">Velocis.</span><span>© 2025 Velocis · Built by <span className="text-[#16141A] font-semibold">Merge Conflict</span></span></div>
        <div className="flex gap-7 font-medium">{[['About Us', '/about'], ['Blog', '/blog'], ['Twitter', '#'], ['GitHub', '#']].map(([l, href]) => <a key={l} href={href} target="_blank" rel="noopener noreferrer" className="hover:text-[#16141A] transition-colors" onClick={(e) => { if (href.startsWith('/')) { e.preventDefault(); window.open(href, '_blank', 'noopener,noreferrer'); } }}>{l}</a>)}</div>
      </div>
    </footer>
  );
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <GStyle /><ProgBar /><Grain /><Nav /><Hero />
      <Divider />
      <section className="relative py-14 overflow-hidden bg-white">
        <Frags s="left" /><Frags s="right" />
        <div className="max-w-[1080px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-[1.22fr_1fr] gap-16 relative z-10">
          <Form /><Info />
        </div>
      </section>
      <Methods />
      <Divider />
      <FAQ />
      <CTA />
      <Foot />
    </div>
  );
}
