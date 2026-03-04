import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import Lenis from '@studio-freight/lenis';

import Hero from '../components/LandingPage/Hero';
import LogoCarousel from '../components/LandingPage/LogoCarousel';
import Problem from '../components/LandingPage/Problem';
import TimelineSvg from '../components/LandingPage/TimelineSvg';
import BentoGrid from '../components/LandingPage/BentoGrid';
import HorizontalCarousel from '../components/LandingPage/HorizontalCarousel';
import HowItWorks from '../components/LandingPage/HowItWorks';
import TechStack from '../components/LandingPage/TechStack';
import Stats from '../components/LandingPage/Stats';
import AnimatedFlagCTA from '../components/LandingPage/AnimatedFlagCTA';
import CTA from '../components/LandingPage/CTA';
import Aurora from '../components/LandingPage/Aurora';

export function HomePage() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      infinite: false,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    // Scroll listener for navbar background
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);

    const observerOptions = {
      threshold: 0.15,
      rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    const timeoutId = setTimeout(() => {
      document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    }, 100);

    return () => {
      lenis.destroy();
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="bg-background min-h-screen font-body flex flex-col text-textMain relative" style={{ backgroundColor: 'var(--color-background)' }}>
      <style>{`
        /* ── CTA Button – lift + ripple-after animation ── */
        .cta-btn {
          position: relative;
          transition: transform 0.2s, box-shadow 0.2s;
          overflow: visible;
        }
        .cta-btn:disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
        .cta-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
        }
        .cta-btn:active {
          transform: translateY(-1px);
          box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
        }
        .cta-btn::after {
          content: '';
          display: inline-block;
          height: 100%;
          width: 100%;
          border-radius: inherit;
          position: absolute;
          top: 0; left: 0;
          z-index: -1;
          background-color: var(--cta-primary, #6366f1);
          transition: transform 0.4s, opacity 0.4s;
        }
        .cta-btn:hover::after {
          transform: scaleX(1.4) scaleY(1.6);
          opacity: 0;
        }
        .cta-btn--blue::after  { background-color: var(--cta-primary, #6366f1); }
        .cta-btn--violet::after { background-color: var(--cta-primary, #6366f1); }
      `}</style>
      {/* Aurora Background glow */}
      <div
        className="absolute top-0 left-0 w-full h-[350px] z-0 pointer-events-none opacity-70"
        style={{
          maskImage: 'linear-gradient(to bottom, white 0%, white 50%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, white 0%, white 50%, transparent 100%)'
        }}
      >
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          <Aurora
            colorStops={["#8d5cf6", "#38bdf8", "#3bbb96"]}
            amplitude={1.5}
            blend={0.8}
          />
        </div>
      </div>

      {/* Navigation */}
      <header className={`sticky top-0 z-50 border-b transition-all duration-300 ${isScrolled
          ? 'bg-white/70 backdrop-blur-md border-borderSubtle'
          : 'bg-transparent border-transparent'
        }`}>
        <div className="w-full px-8 h-20 flex items-center justify-between">
          <div className="font-display font-bold text-xl tracking-tight">Velocis.</div>
          <button onClick={() => navigate('/auth')} className="cta-btn px-5 py-2.5 rounded-button font-medium" style={{ backgroundColor: 'var(--cta-primary)', color: 'var(--cta-text)' }}>
            Connect Repository
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow">
        <Hero />
        <LogoCarousel />
        <Problem />
        <TimelineSvg />
        <BentoGrid />
        <HorizontalCarousel />
        <HowItWorks />
        <TechStack />
        <Stats />
      </main>

      <AnimatedFlagCTA />
      <CTA />
    </div>
  );
}
