import { Github } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleConnect = () => {
    navigate('/onboarding');
  };

  const handleLogin = () => {
    navigate('/onboarding');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[--border-subtle]">
      <div className="max-w-[1200px] mx-auto px-6 h-[72px] flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 bg-[--text-primary] rounded-lg flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 2L18 7V13L10 18L2 13V7L10 2Z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M10 2V10" stroke="white" strokeWidth="2"/>
              <path d="M2 7L10 10" stroke="white" strokeWidth="2"/>
              <path d="M18 7L10 10" stroke="white" strokeWidth="2"/>
            </svg>
          </div>
          <span className="text-lg font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Velocis
          </span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <button 
            onClick={handleLogin}
            className="text-[15px] hover:opacity-70 transition-opacity cursor-pointer"
            style={{ color: 'var(--text-secondary)' }}
          >
            Login
          </button>
          <button 
            onClick={handleConnect}
            className="px-5 py-2.5 rounded-[10px] flex items-center gap-2 transition-all hover:translate-y-[-1px] hover:shadow-lg"
            style={{ 
              backgroundColor: 'var(--cta-primary)',
              color: 'var(--cta-text)'
            }}
          >
            <Github className="w-4 h-4" />
            <span className="font-medium">Connect with GitHub</span>
          </button>
        </div>
      </div>
    </nav>
  );
}