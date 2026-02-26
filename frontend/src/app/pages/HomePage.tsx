import { useEffect } from 'react';
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

export function HomePage() {
  const navigate = useNavigate();

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
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="bg-background min-h-screen font-body flex flex-col text-textMain" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-borderSubtle">
        <div className="w-full px-8 h-20 flex items-center justify-between">
          <div className="font-display font-bold text-xl tracking-tight">Velocis.</div>
          <button onClick={() => navigate('/auth')} className="bg-dark text-textInverse px-5 py-2.5 rounded-button font-medium hover:bg-dark/90 transition-colors">
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
