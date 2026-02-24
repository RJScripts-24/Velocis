"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Shield, TestTube2, Eye, Send, Paperclip, MoreVertical, FileCode, Sun, Moon, ChevronLeft, AlertCircle, Lightbulb, Info } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';

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
  content: string;
  timestamp: string;
}

const initialMessages: Message[] = [
  {
    role: 'sentinel',
    content: "I've analyzed the authentication controller. I noticed a potential race condition in the login method at line 15. The token generation is happening without proper rate limiting, which could lead to security vulnerabilities.\n\n**Recommendations:**\n• Add rate limiting middleware\n• Implement token expiry validation\n• Consider using Redis for session management\n\nWould you like me to generate a refactored version?",
    timestamp: '2 min ago'
  }
];

const regionalMessages: Record<string, Message[]> = {
  en: initialMessages,
  hi: [
    {
      role: 'sentinel',
      content: "मैंने authentication controller का विश्लेषण किया है। मुझे line 15 पर login method में एक potential race condition मिली है। Token generation बिना proper rate limiting के हो रहा है, जो security vulnerabilities का कारण बन सकता है।\n\n**सुझाव:**\n• Rate limiting middleware जोड़ें\n• Token expiry validation implement करें\n• Session management के लिए Redis का उपयोग करें\n\nक्या आप चाहेंगे कि मैं refactored version generate करूं?",
      timestamp: '2 मिनट पहले'
    }
  ],
  ta: [
    {
      role: 'sentinel',
      content: "நான் authentication controller ஐ பகுப்பாய்வு செய்துள்ளேன். Line 15 இல் login method இல் ஒரு potential race condition ஐ கண்டேன். Token generation சரியான rate limiting இல்லாமல் நடக்கிறது, இது security vulnerabilities க்கு வழிவகுக்கும்.\n\n**பரிந்துரைகள்:**\n• Rate limiting middleware ஐ சேர்க்கவும்\n• Token expiry validation ஐ செயல்படுத்தவும்\n• Session management க்கு Redis ஐ பயன்படுத்தவும்\n\nநான் refactored version ஐ உருவாக்க வேண்டுமா?",
      timestamp: '2 நிமிடங்களுக்கு முன்பு'
    }
  ]
};

export function WorkspacePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [language, setLanguage] = useState<'en' | 'hi' | 'ta'>('en');
  const [messages, setMessages] = useState<Message[]>(regionalMessages[language]);
  const [inputValue, setInputValue] = useState('');
  const [fileDrawerOpen, setFileDrawerOpen] = useState(false);
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  
  const repoName = id === 'infrazero' ? 'InfraZero' : 
                   id === 'immersa' ? 'Immersa' : 
                   id === 'velocis-core' ? 'velocis-core' :
                   id === 'ai-observatory' ? 'ai-observatory' :
                   id === 'distributed-lab' ? 'distributed-lab' :
                   'test-sandbox';

  const handleLanguageChange = (newLang: 'en' | 'hi' | 'ta') => {
    setLanguage(newLang);
    setMessages(regionalMessages[newLang]);
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    
    const newMessage: Message = {
      role: 'user',
      content: inputValue,
      timestamp: 'Just now'
    };
    
    setMessages([...messages, newMessage]);
    setInputValue('');
    
    // Simulate Sentinel response
    setTimeout(() => {
      const responseContent = language === 'en' 
        ? "I can help you refactor this code. Let me show you a safer implementation with rate limiting and proper error handling."
        : language === 'hi'
        ? "मैं इस code को refactor करने में आपकी मदद कर सकता हूं। मैं आपको rate limiting और proper error handling के साथ एक safer implementation दिखाता हूं।"
        : "இந்த code ஐ refactor செய்ய நான் உங்களுக்கு உதவ முடியும். Rate limiting மற்றும் சரியான error handling உடன் பாதுகாப்பான implementation ஐ காட்டுகிறேன்.";
      
      const sentinelResponse: Message = {
        role: 'sentinel',
        content: responseContent,
        timestamp: 'Just now'
      };
      setMessages(prev => [...prev, sentinelResponse]);
    }, 1000);
  };

  const annotations = [
    { line: 15, type: 'warning', message: 'Sentinel: Potential race condition detected. Token generation needs rate limiting.' },
    { line: 32, type: 'suggestion', message: 'Suggested refactor: Extract user validation into a separate method for better testability.' },
    { line: 39, type: 'info', message: 'Consider adding proper error logging for production debugging.' }
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-soft)' }}>
      {/* Workspace Top Bar */}
      <div 
        className="sticky top-0 z-50 border-b bg-white"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="px-6 h-[60px] flex items-center justify-between">
          {/* Left - Breadcrumb */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div 
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--cta-primary)' }}
              >
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <span className="font-bold text-white hidden sm:block">Velocis</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <button 
                onClick={() => navigate('/dashboard')}
                className="hover:opacity-70 transition-opacity"
              >
                Dashboard
              </button>
              <span>/</span>
              <button 
                onClick={() => navigate(`/repo/${id}`)}
                className="hover:opacity-70 transition-opacity"
              >
                {repoName}
              </button>
              <span>/</span>
              <span className="text-black font-medium">Workspace</span>
            </div>
          </div>

          {/* Center - File Context */}
          <button 
            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileCode className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              auth-service / auth.controller.ts
            </span>
            <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          </button>

          {/* Right - Actions */}
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-lg hover:bg-gray-50 transition-colors">
              <Sun className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            </button>
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--accent-purple-soft)' }}
            >
              <span className="text-sm font-semibold" style={{ color: 'var(--accent-purple)' }}>
                R
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Repo Context Strip */}
      <div 
        className="px-6 py-3 flex items-center justify-between"
        style={{ backgroundColor: 'var(--bg-soft)' }}
      >
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Sentinel is actively analyzing this repository.
        </span>
        
        <div className="flex items-center gap-3">
          <div 
            className="flex items-center gap-1.5 px-3 py-1 rounded-full"
            style={{ backgroundColor: 'var(--accent-purple-soft)' }}
          >
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent-purple)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--accent-purple)' }}>
              Sentinel Active
            </span>
          </div>
          <div 
            className="flex items-center gap-1.5 px-3 py-1 rounded-full"
            style={{ backgroundColor: 'var(--accent-blue-soft)' }}
          >
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent-blue)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--accent-blue)' }}>
              Fortress Synced
            </span>
          </div>
          <div 
            className="flex items-center gap-1.5 px-3 py-1 rounded-full"
            style={{ backgroundColor: 'var(--accent-green-soft)' }}
          >
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent-green)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--accent-green)' }}>
              Cortex Live
            </span>
          </div>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Drawer (Optional) */}
        <AnimatePresence>
          {fileDrawerOpen && (
            <motion.div
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="w-[280px] border-r bg-white p-4"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="text-xs font-semibold tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>
                FILE EXPLORER
              </div>
              <div className="space-y-1">
                {['services', 'controllers', 'utils', 'tests'].map((folder) => (
                  <div key={folder} className="px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer text-sm">
                    📁 {folder}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Code Viewer Panel */}
        <div className="flex-1 lg:w-[58%] flex flex-col bg-white border-r" style={{ borderColor: 'var(--border-subtle)' }}>
          {/* File Header Bar */}
          <div 
            className="px-6 py-3 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => setFileDrawerOpen(!fileDrawerOpen)}
                className="p-1 hover:bg-gray-50 rounded transition-colors lg:hidden"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 text-sm">
                <FileCode className="w-4 h-4" style={{ color: 'var(--accent-purple)' }} />
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  auth.controller.ts
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>•</span>
                <span style={{ color: 'var(--text-secondary)' }}>main</span>
                <span style={{ color: 'var(--text-secondary)' }}>•</span>
                <span style={{ color: 'var(--text-secondary)' }}>Updated 12 min ago</span>
              </div>
            </div>
            
            <div 
              className="px-2 py-1 rounded text-xs font-medium"
              style={{ 
                backgroundColor: 'var(--accent-green-soft)',
                color: 'var(--accent-green)'
              }}
            >
              Saved
            </div>
          </div>

          {/* Code Area */}
          <div className="flex-1 overflow-auto">
            <div className="relative">
              <pre className="text-sm leading-relaxed p-6" style={{ fontFamily: 'Menlo, Monaco, "Courier New", monospace' }}>
                {codeExample.split('\n').map((line, index) => {
                  const lineNumber = index + 1;
                  const annotation = annotations.find(a => a.line === lineNumber);
                  
                  return (
                    <div 
                      key={index}
                      className="flex items-start group relative"
                      onMouseEnter={() => annotation && setHoveredLine(lineNumber)}
                      onMouseLeave={() => setHoveredLine(null)}
                    >
                      {/* Line number */}
                      <span 
                        className="inline-block w-12 text-right mr-6 select-none flex-shrink-0"
                        style={{ color: '#9ca3af' }}
                      >
                        {lineNumber}
                      </span>
                      
                      {/* Annotation marker in gutter */}
                      {annotation && (
                        <div className="absolute left-0 top-0 w-1 h-full">
                          {annotation.type === 'warning' && (
                            <div 
                              className="w-1 h-full rounded-r"
                              style={{ backgroundColor: 'var(--accent-purple)' }}
                            />
                          )}
                          {annotation.type === 'suggestion' && (
                            <div 
                              className="w-1 h-full rounded-r"
                              style={{ backgroundColor: 'var(--accent-green)' }}
                            />
                          )}
                          {annotation.type === 'info' && (
                            <div 
                              className="w-1 h-full rounded-r"
                              style={{ backgroundColor: 'var(--accent-blue)' }}
                            />
                          )}
                        </div>
                      )}
                      
                      {/* Code line */}
                      <span 
                        className={`flex-1 ${annotation ? 'bg-purple-50' : ''}`}
                        style={{ color: '#1f2937' }}
                      >
                        {line}
                      </span>
                      
                      {/* Tooltip on hover */}
                      {annotation && hoveredLine === lineNumber && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute left-16 top-full mt-1 z-10 rounded-lg p-3 shadow-lg max-w-sm"
                          style={{
                            backgroundColor: 
                              annotation.type === 'warning' ? 'var(--accent-purple-soft)' :
                              annotation.type === 'suggestion' ? 'var(--accent-green-soft)' :
                              'var(--accent-blue-soft)',
                            border: '1px solid var(--border-subtle)'
                          }}
                        >
                          <div className="flex items-start gap-2">
                            {annotation.type === 'warning' && <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent-purple)' }} />}
                            {annotation.type === 'suggestion' && <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent-green)' }} />}
                            {annotation.type === 'info' && <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent-blue)' }} />}
                            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                              {annotation.message}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </pre>
            </div>
          </div>
        </div>

        {/* Sentinel Chat Panel */}
        <div className="w-full lg:w-[42%] flex flex-col bg-white">
          {/* Chat Header */}
          <div 
            className="px-6 py-4 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'var(--accent-purple-soft)' }}
              >
                <Shield className="w-5 h-5" style={{ color: 'var(--accent-purple)' }} />
              </div>
              <div>
                <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Sentinel AI
                </div>
                <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#22c55e' }} />
                  <span>Live analysis</span>
                </div>
              </div>
            </div>

            {/* Regional Mentorship Hub Toggle */}
            <div>
              <div className="text-[10px] font-semibold tracking-wider mb-1.5 text-center" style={{ color: 'var(--text-secondary)' }}>
                REGIONAL MENTORSHIP
              </div>
              <div 
                className="flex items-center rounded-lg p-1"
                style={{ backgroundColor: 'var(--bg-soft)' }}
              >
                {(['en', 'hi', 'ta'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => handleLanguageChange(lang)}
                    className="px-3 py-1 rounded-md text-xs font-medium transition-all"
                    style={{
                      backgroundColor: language === lang ? '#ffffff' : 'transparent',
                      color: language === lang ? 'var(--accent-purple)' : 'var(--text-secondary)',
                      boxShadow: language === lang ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                    }}
                  >
                    {lang === 'en' ? 'EN' : lang === 'hi' ? 'हिंदी' : 'தமிழ்'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <AnimatePresence mode="wait">
              {messages.map((message, index) => (
                <motion.div
                  key={`${language}-${index}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className="max-w-[85%] rounded-[14px] px-4 py-3"
                    style={{
                      backgroundColor: message.role === 'sentinel' 
                        ? 'var(--accent-purple-soft)' 
                        : '#f3f4f6'
                    }}
                  >
                    <p 
                      className="text-sm leading-relaxed whitespace-pre-line"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {message.content}
                    </p>
                    <span className="text-[10px] mt-2 block" style={{ color: 'var(--text-secondary)' }}>
                      {message.timestamp}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Chat Input Bar */}
          <div 
            className="border-t p-4"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="mb-2">
              <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                Sentinel is analyzing the current file context.
              </span>
            </div>
            
            <div className="flex items-end gap-2">
              <div 
                className="flex-1 rounded-lg border flex items-end"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ask Sentinel about this code…"
                  className="flex-1 px-4 py-3 rounded-lg text-sm resize-none focus:outline-none"
                  style={{ color: 'var(--text-primary)' }}
                  rows={1}
                />
                <button className="p-3 hover:bg-gray-50 rounded transition-colors">
                  <Paperclip className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                </button>
              </div>
              
              <button
                onClick={handleSendMessage}
                className="p-3 rounded-lg transition-all hover:opacity-80"
                style={{ backgroundColor: 'var(--accent-purple)' }}
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Context Bar */}
      <div 
        className="border-t px-6 py-2 flex items-center justify-between text-xs backdrop-blur-sm"
        style={{ 
          borderColor: 'var(--border-subtle)',
          backgroundColor: 'rgba(255, 255, 255, 0.95)'
        }}
      >
        <div style={{ color: 'var(--text-secondary)' }}>
          Current focus: <span style={{ color: 'var(--text-primary)' }} className="font-medium">auth-service</span>
        </div>
        <div style={{ color: 'var(--text-secondary)' }}>
          Last Sentinel review: <span style={{ color: 'var(--text-primary)' }} className="font-medium">2 min ago</span>
        </div>
      </div>
    </div>
  );
}
