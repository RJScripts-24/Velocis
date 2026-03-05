"use client";

import { useState } from 'react';
import { Github, Menu, X } from 'lucide-react';
import lightLogoImg from '../../../LightLogo.png';
import { useNavigate, useLocation } from 'react-router';
import { PrimaryButton } from './shared/PrimaryButton';
import { GhostButton } from './shared/GhostButton';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001';

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleConnect = () => {
    window.location.href = `${BACKEND_URL}/api/auth/github`;
  };

  const handleLogin = () => {
    window.location.href = `${BACKEND_URL}/api/auth/github`;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/30 backdrop-blur-xl border-b border-white/40 shadow-sm">
      <nav className="v-container h-[72px] flex items-center justify-between" aria-label="Main navigation">
        {/* Logo */}
        <div
          className="flex items-center cursor-pointer select-none"
          onClick={() => navigate('/')}
          role="link"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/')}
        >
          <img src={lightLogoImg} alt="Velocis" className="h-8 w-auto object-contain" />

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