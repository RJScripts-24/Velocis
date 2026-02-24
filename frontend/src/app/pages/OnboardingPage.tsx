"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, CheckCircle, Lock, Eye, Shield, GitBranch } from 'lucide-react';
import { useNavigate } from 'react-router';

export function OnboardingPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installComplete, setInstallComplete] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const repositories = [
    {
      name: 'InfraZero',
      visibility: 'Private',
      lastUpdate: '2 days ago',
      language: 'TypeScript',
      languageColor: '#3178c6'
    },
    {
      name: 'Immersa',
      visibility: 'Private',
      lastUpdate: '5 hours ago',
      language: 'Python',
      languageColor: '#3572A5'
    },
    {
      name: 'velocis-core',
      visibility: 'Private',
      lastUpdate: '1 week ago',
      language: 'TypeScript',
      languageColor: '#3178c6'
    },
    {
      name: 'ai-observatory',
      visibility: 'Public',
      lastUpdate: '3 days ago',
      language: 'JavaScript',
      languageColor: '#f1e05a'
    },
    {
      name: 'distributed-lab',
      visibility: 'Private',
      lastUpdate: '2 weeks ago',
      language: 'Go',
      languageColor: '#00ADD8'
    },
    {
      name: 'test-sandbox',
      visibility: 'Public',
      lastUpdate: '1 day ago',
      language: 'Python',
      languageColor: '#3572A5'
    }
  ];

  const installSteps = [
    { label: 'Registering GitHub webhook', icon: GitBranch },
    { label: 'Initializing Sentinel', icon: Shield },
    { label: 'Provisioning Fortress QA loop', icon: CheckCircle },
    { label: 'Activating Visual Cortex', icon: Eye }
  ];

  const filteredRepos = repositories.filter(repo =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInstall = (repoName: string) => {
    setSelectedRepo(repoName);
    setIsInstalling(true);
    setCurrentStep(0);

    // Simulate installation steps
    const stepDuration = 1200;
    installSteps.forEach((_, index) => {
      setTimeout(() => {
        setCurrentStep(index + 1);
        if (index === installSteps.length - 1) {
          setTimeout(() => {
            setInstallComplete(true);
          }, 800);
        }
      }, stepDuration * (index + 1));
    });
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-soft)' }}>
      {/* Minimal Navbar */}
      <nav 
        className="sticky top-0 z-50 border-b bg-white"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--cta-primary)' }}
            >
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
              Velocis
            </span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <div 
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: 'var(--accent-green-soft)' }}
            >
              <CheckCircle className="w-4 h-4" style={{ color: 'var(--accent-green)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--accent-green)' }}>
                GitHub connected
              </span>
            </div>
            <div 
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--bg-soft)' }}
            >
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                JD
              </span>
            </div>
          </div>
        </div>
      </nav>

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
            <span 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-bold tracking-wider"
              style={{ 
                backgroundColor: 'var(--accent-green-soft)',
                color: 'var(--accent-green)'
              }}
            >
              <CheckCircle className="w-4 h-4" strokeWidth={2.5} />
              GITHUB CONNECTED
            </span>
          </motion.div>

          {/* Main heading */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-5 tracking-tight"
            style={{ 
              fontSize: '36px',
              fontWeight: 600,
              color: 'var(--text-primary)'
            }}
          >
            Select a repository to install Velocis
          </motion.h1>

          {/* Supporting text */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-[16px] leading-[1.7]"
            style={{ color: 'var(--text-secondary)' }}
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
          className="max-w-[1000px] mx-auto rounded-[20px] bg-white border shadow-lg"
          style={{ 
            borderColor: 'var(--border-subtle)',
            padding: '24px 28px'
          }}
        >
          {/* Panel header */}
          <div className="flex items-center justify-between mb-6 pb-5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <h2 
              className="text-xl font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Your repositories
            </h2>

            {/* Search input */}
            <div className="relative">
              <Search 
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--text-secondary)' }}
              />
              <input
                type="text"
                placeholder="Search repositories…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-[10px] border text-sm focus:outline-none focus:ring-2 transition-all"
                style={{ 
                  borderColor: 'var(--border-subtle)',
                  backgroundColor: 'var(--bg-soft)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
          </div>

          {/* Repo list */}
          <div className="space-y-3">
            {filteredRepos.map((repo, index) => (
              <motion.div
                key={repo.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.6 + index * 0.06 }}
                whileHover={{ y: -1, backgroundColor: 'rgba(0, 0, 0, 0.01)' }}
                className="flex items-center justify-between p-4 rounded-[12px] border transition-all"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                {/* Left side */}
                <div className="flex items-center gap-4">
                  {/* Repo icon */}
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'var(--bg-soft)' }}
                  >
                    <GitBranch className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                  </div>

                  <div>
                    {/* Repo name */}
                    <div className="font-semibold text-[15px] mb-1" style={{ color: 'var(--text-primary)' }}>
                      {repo.name}
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                      <span 
                        className="px-2 py-0.5 rounded text-[11px] font-medium"
                        style={{ 
                          backgroundColor: repo.visibility === 'Private' ? 'rgba(0, 0, 0, 0.05)' : 'var(--accent-blue-soft)',
                          color: repo.visibility === 'Private' ? 'var(--text-primary)' : 'var(--accent-blue)'
                        }}
                      >
                        {repo.visibility}
                      </span>
                      <span>•</span>
                      <span>Updated {repo.lastUpdate}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1.5">
                        <div 
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: repo.languageColor }}
                        />
                        <span>{repo.language}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right side - Install button */}
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleInstall(repo.name)}
                  className="px-6 py-2.5 rounded-[10px] font-medium text-[14px] transition-all hover:shadow-lg"
                  style={{ 
                    backgroundColor: 'var(--cta-primary)',
                    color: 'var(--cta-text)'
                  }}
                >
                  Install Velocis
                </motion.button>
              </motion.div>
            ))}
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
                <item.icon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Minimal Footer */}
      <footer className="py-8 px-6 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            © Velocis
          </span>
          <div className="flex items-center gap-6">
            <a href="#" className="text-sm hover:opacity-70 transition-opacity" style={{ color: 'var(--text-secondary)' }}>
              Privacy
            </a>
            <a href="#" className="text-sm hover:opacity-70 transition-opacity" style={{ color: 'var(--text-secondary)' }}>
              Security
            </a>
            <a href="#" className="text-sm hover:opacity-70 transition-opacity" style={{ color: 'var(--text-secondary)' }}>
              Status
            </a>
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
              className="bg-white rounded-[20px] shadow-2xl p-8 max-w-[520px] w-full mx-6"
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
                      const isCompleted = currentStep > index;
                      const isActive = currentStep === index;
                      const isPending = currentStep < index;

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
  );
}