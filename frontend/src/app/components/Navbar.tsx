"use client";

import { useState } from 'react';
import { Github, Menu, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { PrimaryButton } from './shared/PrimaryButton';
import { GhostButton } from './shared/GhostButton';

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleConnect = () => {
    navigate('/onboarding');
  };

  const handleLogin = () => {
    navigate('/onboarding');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[--border-subtle]">
      <nav className="v-container h-[72px] flex items-center justify-between" aria-label="Main navigation">
        {/* Logo */}
        <div
          className="flex items-center gap-2.5 cursor-pointer select-none"
          onClick={() => navigate('/')}
          role="link"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/')}
        >
          <div className="w-8 h-8 bg-[--text-primary] rounded-lg flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M10 2L18 7V13L10 18L2 13V7L10 2Z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
              <path d="M10 2V10" stroke="white" strokeWidth="2" />
              <path d="M2 7L10 10" stroke="white" strokeWidth="2" />
              <path d="M18 7L10 10" stroke="white" strokeWidth="2" />
            </svg>
          </div>
          <span className="text-lg font-semibold tracking-tight text-[--text-primary]">
            Velocis
          </span>
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          <GhostButton onClick={handleLogin}>
            Login
          </GhostButton>
          <PrimaryButton onClick={handleConnect} icon={<Github className="w-4 h-4" />}>
            Connect with GitHub
          </PrimaryButton>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="md:hidden p-2 text-[--text-primary]"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[--border-subtle] bg-white px-6 py-4 flex flex-col gap-3">
          <GhostButton onClick={handleLogin} className="w-full justify-center">
            Login
          </GhostButton>
          <PrimaryButton onClick={handleConnect} icon={<Github className="w-4 h-4" />} fullWidth>
            Connect with GitHub
          </PrimaryButton>
        </div>
      )}
    </header>
  );
}