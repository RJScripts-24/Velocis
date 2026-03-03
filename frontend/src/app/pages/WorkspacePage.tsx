"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Shield, Send, Paperclip, FileCode, Sun, Moon, AlertCircle, Lightbulb, Info, Home, Folder, Sparkles, Zap, CheckCircle2, Activity, Search } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import Editor from '@monaco-editor/react';
import { getWorkspaceFiles, WorkspaceFile, getFileContent, getAnnotations, postChatMessage, getChatHistory, reviewWorkspaceCode } from '../../lib/api';

const INITIAL_FILE = '/src/auth.controller.ts';

const codeExample = `import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password
    );
    
    // Warning annotation on line 15
    const token = await this.authService.generateToken(user);
    
    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    };
  }

  @Post('register')
  @UseGuards(AuthGuard('jwt'))
  async register(@Body() registerDto: RegisterDto, @Req() req: Request) {
    // Suggestion annotation on line 32
    const existingUser = await this.authService.findByEmail(
      registerDto.email
    );
    
    if (existingUser) {
      throw new Error('User already exists');
    }

    const newUser = await this.authService.create(registerDto);
    return this.authService.generateToken(newUser);
  }
}`;

interface Message {
  role: 'sentinel' | 'user';
  content?: string;
  isAnalysis?: boolean;
  analysisData?: {
    line: number;
    title: string;
    description: string;
    chips: string[];
  };
  reviewData?: {
    summary: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    filesReviewed: number;
    findings: Array<{
      severity: 'critical' | 'warning' | 'info';
      filePath: string;
      line?: number;
      title: string;
      description: string;
      fixSuggestion: string;
    }>;
  };
  autoFix?: {
    filePath: string;
    reason: string;
    fixedCode: string;
  } | null;
  autoFixApplied?: boolean;
  timestamp: string;
}

const initialMessages: Message[] = [
  {
    role: 'sentinel',
    isAnalysis: true,
    analysisData: {
      line: 15,
      title: 'Potential Race Condition',
      description: 'Token generation is happening without proper rate limiting, which could lead to security vulnerabilities.',
      chips: ['Add rate limiting middleware', 'Implement token expiry validation', 'Use Redis session management']
    },
    timestamp: '2 min ago'
  }
];

const handleEditorWillMount = (monaco: any) => {
  monaco.editor.defineTheme('velocis-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#010308',
    },
  });
};

const regionalMessages: Record<string, Message[]> = {
  en: initialMessages,
  hi: [
    {
      role: 'sentinel',
      isAnalysis: true,
      analysisData: {
        line: 15,
        title: 'संभावित रेस कंडीशन (Race Condition)',
        description: 'टोकन निर्माण बिना उचित रेट लिमिटिंग (rate limiting) के हो रहा है, जिससे सुरक्षा संबंधी कमजोरियां हो सकती हैं।',
        chips: ['रेट लिमिटिंग मिडलवेयर जोड़ें', 'टोकन समाप्ति सत्यापन लागू करें', 'Redis सेशन प्रबंधन का उपयोग करें']
      },
      timestamp: '2 मिनट पहले'
    }
  ],
  ta: [
    {
      role: 'sentinel',
      isAnalysis: true,
      analysisData: {
        line: 15,
        title: 'இனப் போட்டி நிலை வாய்ப்பு (Race Condition)',
        description: 'சரியான rate limiting இல்லாமல் டோக்கன் உருவாக்கப்படுகிறது, இது பாதுகாப்பு குறைபாடுகளுக்கு வழிவகுக்கும்.',
        chips: ['Rate limiting middleware சேர்க்க', 'Token expiry validation செயல்படுத்த', 'Redis session management பயன்படுத்த']
      },
      timestamp: '2 நிமிடங்களுக்கு முன்பு'
    }
  ]
};

export function WorkspacePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [language, setLanguage] = useState<'en' | 'hi' | 'ta'>('en');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  const [codeContent, setCodeContent] = useState<string>('');
  const [annotations, setAnnotations] = useState<{ line: number; type: string; message: string }[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [allFiles, setAllFiles] = useState<WorkspaceFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Apply dark class to an enclosing wrapper
  const themeClass = isDarkMode ? 'dark' : '';

  const repoName = id ?? 'Unknown';

  // ─ Fetch initial data on mount ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;

    getWorkspaceFiles(id, '/', true)
      .then((wsRes) => {
        const files = wsRes.files.filter(f => f.type === 'file');
        setAllFiles(files);

        const targetFile = files.find(f => f.path === INITIAL_FILE) ? INITIAL_FILE : files[0]?.path;

        if (targetFile) {
          setSelectedFile(targetFile);
          Promise.all([
            getFileContent(id, targetFile).catch(() => null),
            getAnnotations(id, targetFile).catch(() => null),
            getChatHistory(id, 20).catch(() => null),
          ]).then(([fileRes, annotRes, chatRes]) => {
            if (fileRes) setCodeContent(fileRes.content);
            else setCodeContent('// Failed to load file content');

            if (annotRes) {
              setAnnotations(annotRes.annotations.map(a => ({
                line: a.line,
                type: a.type,
                message: `${a.title}: ${a.message}`,
              })));
            }
            if (chatRes) {
              const mapped: Message[] = chatRes.messages.map(m => ({
                role: (m.role === 'user' ? 'user' : 'sentinel') as 'sentinel' | 'user',
                content: m.content,
                isAnalysis: m.is_analysis,
                analysisData: m.analysis ? {
                  line: m.analysis.line,
                  title: m.analysis.title,
                  description: m.analysis.description,
                  chips: m.analysis.suggestions,
                } : undefined,
                reviewData: m.review ? {
                  summary: m.review.summary,
                  riskLevel: m.review.risk_level,
                  filesReviewed: m.review.files_reviewed,
                  findings: m.review.findings.map(f => ({
                    severity: f.severity,
                    filePath: f.file_path,
                    line: f.line,
                    title: f.title,
                    description: f.description,
                    fixSuggestion: f.fix_suggestion,
                  })),
                } : undefined,
                autoFix: m.auto_fix ? {
                  filePath: m.auto_fix.file_path,
                  reason: m.auto_fix.reason,
                  fixedCode: m.auto_fix.fixed_code,
                } : undefined,
                timestamp: m.timestamp_ago,
              }));
              setMessages(mapped);
            }
          });
        }
      })
      .catch(console.error);
  }, [id]);

  const loadFile = async (filePath: string) => {
    if (!id || filePath === selectedFile) return;
    setIsLoadingFile(true);
    setSelectedFile(filePath);
    try {
      const [fileRes, annotRes] = await Promise.all([
        getFileContent(id, filePath).catch(() => null),
        getAnnotations(id, filePath).catch(() => null)
      ]);
      if (fileRes) setCodeContent(fileRes.content);
      else setCodeContent('// Failed to load file content');

      if (annotRes) {
        setAnnotations(annotRes.annotations.map(a => ({
          line: a.line,
          type: a.type,
          message: `${a.title}: ${a.message}`,
        })));
      } else {
        setAnnotations([]);
      }
    } catch {
      setCodeContent('// Error loading file');
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleLanguageChange = (newLang: 'en' | 'hi' | 'ta') => {
    setLanguage(newLang);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !id) return;
    const text = inputValue;
    const newMessage: Message = { role: 'user', content: text, timestamp: 'Just now' };
    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
    setIsSending(true);
    try {
      const res = await postChatMessage(id, { message: text, context: { file_path: selectedFile }, language });
      const reply: Message = {
        role: 'sentinel',
        content: res.content,
        isAnalysis: res.is_analysis,
        analysisData: res.analysis ? {
          line: res.analysis.line,
          title: res.analysis.title,
          description: res.analysis.description,
          chips: res.analysis.suggestions,
        } : undefined,
        reviewData: res.review ? {
          summary: res.review.summary,
          riskLevel: res.review.risk_level,
          filesReviewed: res.review.files_reviewed,
          findings: res.review.findings.map(f => ({
            severity: f.severity,
            filePath: f.file_path,
            line: f.line,
            title: f.title,
            description: f.description,
            fixSuggestion: f.fix_suggestion,
          })),
        } : undefined,
        autoFix: res.auto_fix ? {
          filePath: res.auto_fix.file_path,
          reason: res.auto_fix.reason,
          fixedCode: res.auto_fix.fixed_code,
        } : undefined,
        timestamp: res.timestamp_ago,
      };
      setMessages(prev => [...prev, reply]);
    } catch {
      setMessages(prev => [...prev, { role: 'sentinel', content: 'Failed to get response. Please try again.', timestamp: 'Just now' }]);
    } finally {
      setIsSending(false);
    }
  };

  const handleReviewCode = async () => {
    if (!id || isReviewing) return;
    setIsReviewing(true);
    try {
      const reviewPrompt: Message = {
        role: 'user',
        content: 'Review the full repository and suggest fixes.',
        timestamp: 'Just now',
      };
      setMessages(prev => [...prev, reviewPrompt]);

      const res = await reviewWorkspaceCode(id, { language });
      const reply: Message = {
        role: 'sentinel',
        content: res.content,
        reviewData: res.review ? {
          summary: res.review.summary,
          riskLevel: res.review.risk_level,
          filesReviewed: res.review.files_reviewed,
          findings: res.review.findings.map(f => ({
            severity: f.severity,
            filePath: f.file_path,
            line: f.line,
            title: f.title,
            description: f.description,
            fixSuggestion: f.fix_suggestion,
          })),
        } : undefined,
        autoFix: res.auto_fix ? {
          filePath: res.auto_fix.file_path,
          reason: res.auto_fix.reason,
          fixedCode: res.auto_fix.fixed_code,
        } : undefined,
        timestamp: res.timestamp_ago,
      };
      setMessages(prev => [...prev, reply]);
    } catch {
      setMessages(prev => [...prev, { role: 'sentinel', content: 'Review failed. Please try again.', timestamp: 'Just now' }]);
    } finally {
      setIsReviewing(false);
    }
  };

  const handleAutoFix = (messageIndex: number) => {
    const message = messages[messageIndex];
    const fix = message?.autoFix;
    if (!fix) return;

    setSelectedFile(fix.filePath);
    setCodeContent(fix.fixedCode);
    setAnnotations([]);

    if (!allFiles.some(f => f.path === fix.filePath)) {
      setAllFiles(prev => [
        ...prev,
        {
          name: fix.filePath.split('/').pop() || fix.filePath,
          type: 'file',
          path: fix.filePath,
        },
      ]);
    }

    setMessages(prev => prev.map((m, idx) => (
      idx === messageIndex ? { ...m, autoFixApplied: true } : m
    )));
  };

  // annotations come from API state (set in useEffect above)

  return (
    <div className={`${themeClass} w-full h-full`}>
      <div className="h-screen flex flex-col bg-zinc-50 dark:bg-[#010308] font-['Geist_Sans',_'Inter',_sans-serif] overflow-hidden transition-colors duration-300 relative">

        {/* Dark Mode Radial & Noise Overlays */}
        {isDarkMode && (
          <>
            {/* Deep Slate Radial Glow */}
            <div className="absolute inset-0 pointer-events-none z-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(30,41,59,1)_0%,_rgba(15,23,42,1)_100%)] opacity-80 mix-blend-multiply" />

            {/* Subtle Vignette */}
            <div className="absolute inset-0 pointer-events-none z-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]" />

            {/* Fine Noise Texture */}
            <div
              className="absolute inset-0 pointer-events-none z-0 opacity-[0.03]"
              style={{
                backgroundImage: `url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                mixBlendMode: 'overlay'
              }}
            />
          </>
        )}

        {/* Premium Header */}
        <div className="flex-none z-50 border-b border-zinc-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl transition-colors duration-300 relative">
          <div className="px-6 h-[60px] flex items-center justify-between">
            {/* Left - Breadcrumb */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-900 dark:bg-slate-800 shadow-sm border border-zinc-700 dark:border-slate-700">
                  <span className="text-white font-bold text-sm">V</span>
                </div>
                <span className="font-semibold text-zinc-900 dark:text-slate-100 hidden sm:block tracking-tight">Velocis</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-slate-400 font-medium">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </button>
                <span className="text-zinc-300 dark:text-slate-700">/</span>
                <button
                  onClick={() => navigate(`/repo/${id}`)}
                  className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  <Folder className="w-4 h-4" />
                  <span className="hidden sm:inline">{repoName}</span>
                </button>
                <span className="text-zinc-300 dark:text-slate-700">/</span>
                <span className="text-zinc-900 dark:text-slate-100 font-semibold flex items-center gap-1.5">
                  Workspace
                </span>
              </div>
            </div>

            {/* Center - File Context */}
            <div className="relative hidden md:flex items-center justify-center">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all font-['JetBrains_Mono',_monospace] text-xs font-semibold text-zinc-700 dark:text-slate-300 group"
              >
                <FileCode className="w-4 h-4 text-indigo-500 dark:text-indigo-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors" />
                <span className="truncate max-w-[200px]">{selectedFile.split('/').pop() || selectedFile}</span>
                <ChevronDown className={`w-4 h-4 text-zinc-400 dark:text-slate-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-[400px] bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden z-[100] flex flex-col"
                  >
                    <div className="p-2 border-b border-zinc-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 dark:bg-slate-800/50 rounded-lg border border-zinc-200/50 dark:border-slate-700/50">
                        <Search className="w-3.5 h-3.5 text-zinc-400" />
                        <input
                          autoFocus
                          type="text"
                          placeholder="Search files..."
                          value={fileSearchQuery}
                          onChange={e => setFileSearchQuery(e.target.value)}
                          className="bg-transparent border-none outline-none text-xs text-zinc-700 dark:text-slate-300 w-full placeholder:text-zinc-400"
                        />
                      </div>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-slate-700">
                      {allFiles
                        .filter(f => f.path.toLowerCase().includes(fileSearchQuery.toLowerCase()))
                        .map(f => (
                          <button
                            key={f.path}
                            onClick={() => {
                              setIsDropdownOpen(false);
                              loadFile(f.path);
                            }}
                            className={`w-full text-left px-3 py-2 flex items-center text-xs font-['JetBrains_Mono',_monospace] hover:bg-zinc-50 dark:hover:bg-slate-800 rounded-md transition-colors ${selectedFile === f.path ? 'bg-indigo-50/50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-semibold' : 'text-zinc-600 dark:text-slate-400'}`}
                          >
                            <FileCode className="w-3.5 h-3.5 mr-2 shrink-0 opacity-70" />
                            <span className="truncate" title={f.path}>{f.path}</span>
                          </button>
                        ))
                      }
                      {allFiles.filter(f => f.path.toLowerCase().includes(fileSearchQuery.toLowerCase())).length === 0 && (
                        <div className="px-3 py-4 text-center text-xs text-zinc-500">No files found</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right - Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors text-zinc-500 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-slate-100 hidden sm:block"
              >
                {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-500/20 blur-md rounded-full" />
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-500/30 relative shadow-sm cursor-pointer hover:scale-105 transition-transform">
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">R</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Workspace (70 / 30 Split) */}
        <div className="flex-1 flex overflow-hidden p-4 sm:p-6 gap-6 relative z-10 max-w-[1920px] mx-auto w-full">
          {/* Code Editor Panel (70%) */}
          <div className="flex-1 lg:w-[70%] flex flex-col rounded-2xl border border-zinc-200 dark:border-slate-800 bg-white dark:bg-[#010308]/50 shadow-sm overflow-hidden relative transition-colors duration-300">
            {/* Subtle glow behind editor */}
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-full blur-[100px] pointer-events-none" />

            {/* Editor Header */}
            <div className="px-5 py-3 border-b border-zinc-100 dark:border-slate-800 flex items-center justify-between bg-zinc-50/50 dark:bg-slate-900/40 relative z-10 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                  <span className="font-['JetBrains_Mono',_monospace] text-sm font-semibold text-zinc-800 dark:text-slate-200">
                    {selectedFile.split('/').pop() || selectedFile}
                  </span>
                  <span className="text-zinc-300 dark:text-slate-700 mx-1 hidden sm:inline">•</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-zinc-200/50 dark:bg-slate-800 text-zinc-600 dark:text-slate-400 hidden sm:inline transition-colors">main</span>
                  <span className="text-zinc-300 dark:text-slate-700 mx-1 hidden md:inline">•</span>
                  <span className="text-xs text-zinc-400 dark:text-slate-500 font-medium hidden md:inline">Updated 12 min ago</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-800/30 flex items-center gap-1.5 shadow-sm transition-colors">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Saved
                </div>
              </div>
            </div>

            {/* Editor Area */}
            <div className={`flex-1 overflow-auto bg-transparent relative z-10 pt-2 pb-0 transition-opacity duration-300 ${isLoadingFile ? 'opacity-50' : 'opacity-100'}`}>
              <Editor
                height="100%"
                width="100%"
                defaultLanguage="typescript"
                theme={isDarkMode ? 'velocis-dark' : 'light'}
                beforeMount={handleEditorWillMount}
                value={codeContent}
                onChange={(value) => setCodeContent(value ?? '')}
                options={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 13,
                  lineHeight: 1.65,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                  cursorBlinking: 'smooth',
                  padding: { top: 16 },
                  renderLineHighlight: 'all',
                  scrollbar: {
                    verticalScrollbarSize: 8,
                    horizontalScrollbarSize: 8,
                  },
                }}
                className="transition-colors duration-300"
              />
            </div>
          </div>

          {/* AI Panel (30%) - Floating Glassmorphic */}
          <div className="hidden lg:flex w-[30%] flex-col rounded-2xl border border-zinc-200/60 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] overflow-hidden relative transition-colors duration-300">

            {/* Top Edge Glow */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent blur-sm" />

            {/* AI Header */}
            <div className="px-5 py-4 flex items-center justify-between border-b border-zinc-100/80 dark:border-slate-800/80 transition-colors">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-indigo-400/20 dark:bg-indigo-500/30 blur-md rounded-xl animate-pulse" />
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-900 border border-indigo-100/50 dark:border-indigo-500/30 shadow-sm relative">
                    <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                </div>
                <div>
                  <div className="font-bold text-sm text-zinc-900 dark:text-slate-100 tracking-tight transition-colors">
                    Sentinel AI
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 tracking-wide uppercase transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-[pulse_2s_ease-in-out_infinite] shadow-[0_0_8px_rgba(16,185,129,0.8)] dark:shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                    <span>Cortex Live</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                {/* Regional Mentorship Hub Toggle */}
                <div className="bg-zinc-100/80 dark:bg-slate-800/80 p-0.5 rounded-lg flex items-center border border-zinc-200/50 dark:border-slate-700/50 shadow-inner transition-colors">
                  {(['en', 'hi', 'ta'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => handleLanguageChange(lang)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${language === lang ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm border border-zinc-200/50 dark:border-slate-600/50' : 'text-zinc-500 dark:text-slate-400 hover:text-zinc-700 dark:hover:text-slate-200'}`}
                    >
                      {lang === 'en' ? 'EN' : lang === 'hi' ? 'HI' : 'TA'}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleReviewCode}
                  disabled={isReviewing || !id}
                  className="w-full min-w-[110px] px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[11px] font-semibold disabled:opacity-50 hover:bg-zinc-800 dark:hover:bg-white transition-colors flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isReviewing ? 'Reviewing...' : 'Review Code'}</span>
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-slate-700">
              <AnimatePresence mode="wait">
                {messages.map((message, index) => (
                  <motion.div
                    key={`${language}-${index}`}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[95%] ${message.role === 'user' ? 'bg-zinc-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl rounded-tr-sm px-4 py-3 shadow-md' : 'w-full'}`}>

                      {message.role === 'sentinel' ? (
                        message.reviewData ? (
                          <div className="bg-white dark:bg-slate-800/90 rounded-xl border border-indigo-100/60 dark:border-indigo-500/20 shadow-[0_4px_20px_rgba(99,102,241,0.06)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.2)] overflow-hidden relative transition-colors">
                            <div className="p-4">
                              <div className="flex items-center justify-between gap-3 mb-3">
                                <div className="px-2 py-1 rounded border border-indigo-200/80 dark:border-indigo-500/30 bg-indigo-50/80 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-['JetBrains_Mono',_monospace] text-[10px] uppercase font-bold tracking-wider">
                                  Full Repo Review
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${message.reviewData.riskLevel === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400' : message.reviewData.riskLevel === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400' : message.reviewData.riskLevel === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'}`}>
                                  Risk: {message.reviewData.riskLevel}
                                </span>
                              </div>

                              <p className="text-[13px] text-zinc-600 dark:text-slate-300 leading-relaxed mb-4 transition-colors whitespace-pre-line">
                                {message.reviewData.summary}
                              </p>

                              {message.reviewData.findings.length > 0 && (
                                <div className="space-y-2 mb-4">
                                  {message.reviewData.findings.slice(0, 3).map((finding, findingIndex) => (
                                    <div key={`${finding.filePath}-${findingIndex}`} className="rounded-lg border border-zinc-200 dark:border-slate-700 bg-zinc-50/80 dark:bg-slate-900/60 p-2.5">
                                      <div className="text-[11px] font-semibold text-zinc-800 dark:text-slate-100">
                                        [{finding.severity.toUpperCase()}] {finding.filePath}{finding.line ? `:${finding.line}` : ''}
                                      </div>
                                      <div className="text-[12px] text-zinc-600 dark:text-slate-300 mt-1">
                                        {finding.title}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {message.autoFix && (
                                <button
                                  onClick={() => handleAutoFix(index)}
                                  disabled={message.autoFixApplied}
                                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-zinc-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-zinc-800 dark:hover:bg-white disabled:opacity-60 text-sm font-semibold transition-all shadow-[0_0_15px_rgba(24,24,27,0.2)] dark:shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                                >
                                  <Sparkles className="w-4 h-4" />
                                  <span>{message.autoFixApplied ? 'Auto Fix Applied' : 'Auto Fix'}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ) : message.isAnalysis && message.analysisData ? (
                          /* Actionable Analysis UI */
                          <div className="bg-white dark:bg-slate-800/90 rounded-xl border border-indigo-100/60 dark:border-indigo-500/20 shadow-[0_4px_20px_rgba(99,102,241,0.06)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.2)] overflow-hidden relative group transition-colors">
                            {/* Glow effect behind card */}
                            <div className="absolute -inset-1 bg-gradient-to-b from-indigo-50/50 dark:from-indigo-500/10 to-transparent blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                            <div className="p-4 relative">
                              {/* Line Indicator */}
                              <div className="flex items-center gap-2 mb-3">
                                <div className="px-2 py-1 rounded border border-indigo-200/80 dark:border-indigo-500/30 bg-indigo-50/80 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-['JetBrains_Mono',_monospace] text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5 shadow-sm transition-colors">
                                  <FileCode className="w-3 h-3" />
                                  Line {message.analysisData.line}
                                </div>
                                <span className="text-xs font-bold text-zinc-900 dark:text-slate-100 tracking-tight transition-colors">{message.analysisData.title}</span>
                              </div>

                              <p className="text-[13px] text-zinc-600 dark:text-slate-300 leading-relaxed mb-4 transition-colors">
                                {message.analysisData.description}
                              </p>

                              {/* Actionable Chips */}
                              <div className="flex flex-wrap gap-2 mb-4">
                                {message.analysisData.chips.map((chip, i) => (
                                  <button key={i} className="px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-slate-900 border border-zinc-200 dark:border-slate-700 text-zinc-700 dark:text-slate-300 text-xs font-medium hover:bg-white dark:hover:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-400 hover:shadow-sm transition-all flex items-center gap-1.5 text-left group/chip">
                                    <Zap className="w-3 h-3 text-emerald-500 dark:text-emerald-400 shrink-0 group-hover/chip:text-indigo-500 dark:group-hover/chip:text-indigo-400 transition-colors" />
                                    <span>{chip}</span>
                                  </button>
                                ))}
                              </div>

                              {/* Apply Fix Button */}
                              <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-zinc-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-zinc-800 dark:hover:bg-white text-sm font-semibold transition-all shadow-[0_0_15px_rgba(24,24,27,0.2)] dark:shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(24,24,27,0.3)] dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] relative overflow-hidden group/btn">
                                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 dark:via-black/5 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]" />
                                <Sparkles className="w-4 h-4 text-indigo-300 dark:text-indigo-600 group-hover/btn:scale-110 group-hover/btn:text-indigo-200 dark:group-hover/btn:text-indigo-500 transition-all" />
                                <span>Apply Fix</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Standard Sentinel Text */
                          <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-zinc-100/80 dark:border-slate-700/80 relative transition-colors">
                            <p className="text-[13px] text-zinc-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                              {message.content}
                            </p>
                          </div>
                        )
                      ) : (
                        /* User Message */
                        <p className="text-[13px] leading-relaxed">
                          {message.content}
                        </p>
                      )}
                      <span className={`text-[9px] mt-1.5 block font-semibold uppercase tracking-wider ${message.role === 'user' ? (isDarkMode ? 'text-slate-500 text-right' : 'text-zinc-400 text-right') : 'text-zinc-400 dark:text-slate-500'}`}>
                        {message.timestamp}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Chat Input */}
            <div className="p-4 bg-white/60 dark:bg-slate-900/60 border-t border-zinc-100/80 dark:border-slate-800/80 backdrop-blur-xl shrink-0 transition-colors">
              <div className="flex items-end gap-2 p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 shadow-sm focus-within:border-indigo-400 dark:focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 dark:focus-within:ring-indigo-500/20 transition-all">
                <button className="p-2 text-zinc-400 dark:text-slate-500 hover:text-zinc-600 dark:hover:text-slate-300 hover:bg-zinc-50 dark:hover:bg-slate-700 rounded-lg transition-colors shrink-0">
                  <Paperclip className="w-4 h-4" />
                </button>
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ask Sentinel to analyze or refactor..."
                  className="flex-1 max-h-32 min-h-[40px] bg-transparent text-sm text-zinc-800 dark:text-slate-200 placeholder:text-zinc-400 dark:placeholder:text-slate-500 resize-none py-2.5 px-1 focus:outline-none transition-colors"
                  rows={1}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim()}
                  className="p-2.5 rounded-lg bg-zinc-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-zinc-800 dark:hover:bg-white disabled:opacity-50 disabled:hover:bg-zinc-900 dark:disabled:hover:bg-slate-100 transition-colors shrink-0 shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Unified IDE Status Bar */}
        <div className="h-7 shrink-0 border-t border-zinc-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-4 text-[11px] font-['JetBrains_Mono',_monospace] font-medium z-50 overflow-hidden transition-colors duration-300">
          <div className="flex items-center gap-5 text-zinc-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors group">
              <Shield className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              <span>Sentinel Active</span>
            </div>

            <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
              <div className="w-1.5 h-1.5 rounded-full bg-sky-500 dark:bg-sky-400" />
              <span>Fortress Synced</span>
            </div>

            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              <span>Cortex Live</span>
            </div>
          </div>

          <div className="flex items-center gap-5 text-zinc-400 dark:text-slate-500 hidden sm:flex">
            <span className="hover:text-zinc-600 dark:hover:text-slate-300 cursor-pointer transition-colors">Ln 15, Col 4</span>
            <span className="hover:text-zinc-600 dark:hover:text-slate-300 cursor-pointer transition-colors">UTF-8</span>
            <span className="hover:text-zinc-600 dark:hover:text-slate-300 cursor-pointer transition-colors flex items-center gap-1.5">
              <FileCode className="w-3 h-3" />
              TypeScript React
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
