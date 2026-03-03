"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, CheckCircle, Lock, Eye, Shield, GitBranch, Loader2, Home, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../lib/auth';

// Mock repo — replace with API call once backend auth is live
const MOCK_REPOS = [
  {
    github_id: 1,
    name: 'velocis-commerce',
    visibility: 'private',
    language: 'TypeScript',
    language_color: '#3178c6',
    updated_at: '2026-03-01T00:00:00Z',
    velocis_installed: false,
    description: 'Modern e-commerce platform with AI-powered recommendations',
  },
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [selectedRepoGithubId, setSelectedRepoGithubId] = useState<number | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installComplete, setInstallComplete] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Mock repo list — replace with getGithubRepos() once backend auth is live
  const [repositories, setRepositories] = useState(MOCK_REPOS);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [reposError] = useState<string | null>(null);

  const [installSteps, setInstallSteps] = useState<{ label: string; status: string }[]>([
    { label: 'Registering GitHub webhook', status: 'queued' },
    { label: 'Initializing Sentinel', status: 'queued' },
    { label: 'Provisioning Fortress QA loop', status: 'queued' },
    { label: 'Activating Visual Cortex', status: 'queued' },
  ]);

  const filteredRepos = repositories.filter(repo =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Simulated install — steps complete one by one, then navigate to dashboard
  const handleInstall = (repo: typeof MOCK_REPOS[0]) => {
    setSelectedRepo(repo.name);
    setSelectedRepoGithubId(repo.github_id);
    setIsInstalling(true);
    setInstallComplete(false);
    setCurrentStep(0);

    const steps = [
      'Registering GitHub webhook',
      'Initializing Sentinel',
      'Provisioning Fortress QA loop',
      'Activating Visual Cortex',
    ];

    const resetSteps = steps.map(label => ({ label, status: 'queued' }));
    setInstallSteps(resetSteps);

    steps.forEach((_, idx) => {
      setTimeout(() => {
        setInstallSteps(prev =>
          prev.map((s, i) => i === idx ? { ...s, status: 'complete' } : s)
        );
        setCurrentStep(idx + 1);
        if (idx === steps.length - 1) {
          setInstallComplete(true);
        }
      }, (idx + 1) * 900);
    });
  };

  const themeClass = isDarkMode ? 'dark' : '';

  return (
    <div className={`${themeClass} w-full min-h-screen`}>
      <div className="min-h-screen font-['Geist_Sans',_'Inter',_sans-serif] bg-[#f6f7fb] dark:bg-[#0A0A0E] text-zinc-900 dark:text-slate-100 transition-colors duration-300">

        {/* Premium Navbar — matches Dashboard */}
        <div className="flex-none z-50 border-b border-zinc-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl transition-colors duration-300 sticky top-0">
          <div className="px-6 h-[60px] flex items-center justify-between">

            {/* Left — logo + breadcrumb */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-900 dark:bg-slate-800 shadow-sm border border-zinc-700 dark:border-slate-700">
                  <span className="text-white font-bold text-sm">V</span>
                </div>
                <span className="font-semibold text-zinc-900 dark:text-slate-100 hidden sm:block tracking-tight">Velocis</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-slate-400 font-medium ml-2">
                <Home className="w-4 h-4" />
                <span className="text-zinc-300 dark:text-slate-700">/</span>
                <span className="text-zinc-900 dark:text-slate-100 font-semibold flex items-center gap-1.5">
                  Setup
                </span>
              </div>
            </div>



            {/* Right */}
            <div className="flex items-center gap-3">
              {/* GitHub connected pill */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100/50 dark:border-emerald-800/30">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">GitHub connected</div>
              </div>

              {/* Theme toggle */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 ml-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors text-zinc-500 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-slate-100"
              >
                {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>

            </div>

          </div>
        </div>

        {/* Success State Header */}
        <div className="pt-16 pb-12 px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-[640px] mx-auto text-center"
          >
            {/* Success badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-6"
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-bold tracking-wider bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/30">
                <CheckCircle className="w-4 h-4" strokeWidth={2.5} />
                GITHUB CONNECTED
              </span>
            </motion.div>

            {/* Main heading */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mb-5 tracking-tight text-[36px] font-semibold text-zinc-900 dark:text-slate-100"
            >
              Select a repository to install Velocis
            </motion.h1>

            {/* Supporting text */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-[16px] leading-[1.7] text-zinc-500 dark:text-slate-400"
            >
              Velocis will configure secure webhooks, initialize the autonomous agents, and begin
              continuous analysis of the selected repository.
            </motion.p>
          </motion.div>
        </div>

        {/* Repository Selection Panel */}
        <div className="px-6 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="max-w-[1000px] mx-auto rounded-[20px] bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-lg p-6"
          >
            {/* Panel header */}
            <div className="flex items-center justify-between mb-6 pb-5 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-slate-100">
                Your repositories
              </h2>

              {/* Search input */}
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-slate-500"
                />
                <input
                  type="text"
                  placeholder="Search repositories…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 rounded-[10px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-slate-800/50 text-zinc-900 dark:text-slate-100 placeholder:text-zinc-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                />
              </div>
            </div>

            {/* Repo list */}
            <div className="space-y-3">
              {isLoadingRepos ? (
                <div className="flex items-center justify-center py-12 gap-3 text-zinc-400 dark:text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm font-medium">Loading repositories…</span>
                </div>
              ) : reposError ? (
                <div className="text-center py-12 text-red-500 text-sm">{reposError}</div>
              ) : (
                filteredRepos.map((repo, index) => (
                  <motion.div
                    key={repo.github_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.6 + index * 0.06 }}
                    whileHover={{ y: -1 }}
                    className="flex items-center justify-between p-4 rounded-[12px] border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-all"
                  >
                    {/* Left side */}
                    <div className="flex items-center gap-4">
                      {/* Repo icon */}
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-zinc-100 dark:bg-zinc-800">
                        <GitBranch className="w-5 h-5 text-zinc-500 dark:text-slate-400" />
                      </div>

                      <div>
                        {/* Repo name */}
                        <div className="font-semibold text-[15px] mb-1 text-zinc-900 dark:text-slate-100">
                          {repo.name}
                          {repo.velocis_installed && (
                            <span className="ml-2 px-2 py-0.5 text-[11px] rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/30">
                              Installed
                            </span>
                          )}
                        </div>

                        {/* Metadata */}
                        <div className="flex items-center gap-2 text-[13px] text-zinc-500 dark:text-slate-400">
                          <span
                            className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-slate-400"
                          >
                            {repo.visibility === 'private' ? 'Private' : 'Public'}
                          </span>
                          <span>•</span>
                          <span>Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
                          <span>•</span>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: repo.language_color }} />
                            <span>{repo.language}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right side - Install button */}
                    <motion.button
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleInstall(repo)}
                      disabled={repo.velocis_installed}
                      className="px-6 py-2.5 rounded-[10px] font-medium text-[14px] transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: 'var(--cta-primary)', color: 'var(--cta-text)' }}
                    >
                      {repo.velocis_installed ? 'Installed' : 'Install Velocis'}
                    </motion.button>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* Trust Strip */}
        <div className="py-12 px-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="max-w-[800px] mx-auto"
          >
            <div className="flex flex-wrap items-center justify-center gap-8">
              {[
                { icon: Eye, label: 'Read-only analysis' },
                { icon: Lock, label: 'No code changes' },
                { icon: Shield, label: 'Secure OAuth' },
                { icon: CheckCircle, label: 'Remove anytime' }
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <item.icon className="w-4 h-4 text-zinc-400 dark:text-slate-500" />
                  <span className="text-sm text-zinc-500 dark:text-slate-400">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Minimal Footer */}
        <footer className="py-8 px-6 border-t border-zinc-200 dark:border-zinc-800">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between">
            <span className="text-sm text-zinc-400 dark:text-slate-500">
              © Velocis
            </span>
            <div className="flex items-center gap-6">
              <a href="#" className="text-sm hover:opacity-70 transition-opacity text-zinc-400 dark:text-slate-500">Privacy</a>
              <a href="#" className="text-sm hover:opacity-70 transition-opacity text-zinc-400 dark:text-slate-500">Security</a>
              <a href="#" className="text-sm hover:opacity-70 transition-opacity text-zinc-400 dark:text-slate-500">Status</a>
            </div>
          </div>
        </footer>

        {/* Install Loading Modal */}
        <AnimatePresence>
          {isInstalling && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.22 }}
                className="bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 rounded-[20px] shadow-2xl p-8 max-w-[520px] w-full mx-6"
              >
                {!installComplete ? (
                  <>
                    {/* Header */}
                    <div className="text-center mb-8">
                      <h3
                        className="text-xl font-semibold mb-2"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        Setting up Velocis
                      </h3>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Installing into <span className="font-medium">{selectedRepo}</span>
                      </p>
                    </div>

                    {/* Progress steps */}
                    <div className="space-y-4 mb-8">
                      {installSteps.map((step, index) => {
                        const isCompleted = step.status === 'complete';
                        const isActive = step.status === 'in_progress';
                        const isPending = step.status === 'queued';

                        return (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.1 }}
                            className="flex items-center gap-3"
                          >
                            {/* Icon/Status */}
                            <div className="relative">
                              {isCompleted && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  <CheckCircle
                                    className="w-5 h-5"
                                    style={{ color: 'var(--accent-green)' }}
                                    strokeWidth={2.5}
                                  />
                                </motion.div>
                              )}
                              {isActive && (
                                <motion.div
                                  animate={{
                                    scale: [1, 1.15, 1],
                                    opacity: [0.6, 1, 0.6]
                                  }}
                                  transition={{
                                    duration: 1.2,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                  }}
                                  className="w-5 h-5 rounded-full"
                                  style={{ backgroundColor: 'var(--accent-blue)' }}
                                />
                              )}
                              {isPending && (
                                <div
                                  className="w-5 h-5 rounded-full opacity-30"
                                  style={{ backgroundColor: 'var(--text-secondary)' }}
                                />
                              )}
                            </div>

                            {/* Label */}
                            <span
                              className="text-[15px] transition-opacity"
                              style={{
                                color: 'var(--text-primary)',
                                opacity: isPending ? 0.4 : 1
                              }}
                            >
                              {step.label}
                            </span>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Reassurance text */}
                    <p
                      className="text-center text-[13px] leading-[1.6]"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Velocis is configuring secure, least-privilege access to your repository.
                    </p>
                  </>
                ) : (
                  /* Success state */
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", duration: 0.6 }}
                      className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center"
                      style={{ backgroundColor: 'var(--accent-green-soft)' }}
                    >
                      <CheckCircle
                        className="w-8 h-8"
                        style={{ color: 'var(--accent-green)' }}
                        strokeWidth={2.5}
                      />
                    </motion.div>

                    <h3
                      className="text-2xl font-semibold mb-3"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      Velocis installed successfully
                    </h3>

                    <p
                      className="text-[15px] mb-8"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Your autonomous engineering team is now analyzing <span className="font-medium">{selectedRepo}</span>
                    </p>

                    <motion.button
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        navigate('/dashboard');
                      }}
                      className="px-8 py-3 rounded-[12px] font-medium transition-all hover:shadow-lg"
                      style={{
                        backgroundColor: 'var(--cta-primary)',
                        color: 'var(--cta-text)'
                      }}
                    >
                      Open Dashboard
                    </motion.button>
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}