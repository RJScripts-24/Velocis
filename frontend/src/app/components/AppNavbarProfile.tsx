import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { LogOut, GraduationCap } from 'lucide-react';
import { useAuth } from '../../lib/auth';

interface AppNavbarProfileProps {
  /** Override the display name (e.g. from API response). Falls back to auth user name. */
  userName?: string;
  /** If provided, a "Start Tutorial" item will appear in the dropdown. */
  onTutorial?: () => void;
  /** Optional id for the container element (e.g. "tutorial-profile"). */
  id?: string;
}

/**
 * Profile avatar button + dropdown with sign-out.
 * Shared across all authenticated app pages.
 */
export function AppNavbarProfile({ userName, onTutorial, id }: AppNavbarProfileProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Prefer GitHub login (username), fall back to display name, then prop override
  const githubLogin = user?.login ?? user?.name ?? 'User';
  const displayName = userName ?? githubLogin;
  const initial = (user?.login ?? user?.name ?? displayName)[0]?.toUpperCase() ?? '?';

  // Close dropdown on click outside
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  async function handleSignOut() {
    setOpen(false);
    try {
      await logout();
    } finally {
      navigate('/auth');
    }
  }

  return (
    <div className="relative" ref={containerRef} id={id}>
      {/* Glow ring */}
      <div className="absolute inset-0 bg-indigo-500/20 blur-md rounded-full pointer-events-none" />
      <button
        onClick={() => setOpen(o => !o)}
        className="w-8 h-8 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-500/30 relative shadow-sm cursor-pointer hover:scale-105 transition-transform text-indigo-600 dark:text-indigo-400 font-bold text-sm"
        aria-label="Profile menu"
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg py-1 z-50 animate-in fade-in zoom-in duration-150">
          <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 mb-1">
            <p className="text-sm font-semibold text-zinc-900 dark:text-slate-100 truncate">
              {user?.login ? `@${user.login}` : displayName}
            </p>
            {user?.name && user.name !== user.login && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{user.name}</p>
            )}
          </div>
          {/* onMouseDown + preventDefault so blur doesn't close the dropdown before the click fires */}
          {onTutorial && (
            <button
              onMouseDown={(e) => { e.preventDefault(); setOpen(false); onTutorial(); }}
              className="w-full text-left px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 flex items-center gap-2 transition-colors"
            >
              <GraduationCap className="w-4 h-4" />
              Start Tutorial
            </button>
          )}
          {onTutorial && <div className="mx-3 my-1 border-t border-zinc-100 dark:border-zinc-800" />}
          <button
            onMouseDown={(e) => { e.preventDefault(); handleSignOut(); }}
            className="w-full text-left px-4 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
