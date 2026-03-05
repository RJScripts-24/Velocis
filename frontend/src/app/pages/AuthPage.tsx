import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import gsap from 'gsap';
import { Github, Check, AlertCircle } from 'lucide-react';
import lightLogoImg from '../../../LightLogo.png';

// The backend API base URL — point to localhost during dev
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001';

/* ─── entrance animation (drop-in; swap for gsap if available) ─────────────── */
const useEntrance = (ref: React.RefObject<HTMLDivElement | null>) => {
    useEffect(() => {
        if (!ref.current) return;
        ref.current.querySelectorAll<HTMLElement>('.fade-up').forEach((el, i) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = `opacity .7s ease ${i * .1}s, transform .7s ease ${i * .1}s`;
            void el.offsetHeight;
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        });
    }, [ref]);
};

const PERMISSIONS = [
    'Read repository contents',
    'Monitor commits & pull requests',
    'Write automated test suggestions',
    'Create architecture insights',
    'Review security vulnerabilities',
] as const;

/* ─── shared defs ──────────────────────────────────────────────────────────── */
const SVG_DEFS = (
    <defs>
        {/* Glows */}
        <filter id="glow2" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="glow5" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        {/* Background ambients */}
        <radialGradient id="leftAmbient" cx="60%" cy="48%" r="60%">
            <stop offset="0%" stopColor="#1E40AF" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#1E40AF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="rightAmbient" cx="45%" cy="50%" r="65%">
            <stop offset="0%" stopColor="#0D9488" stopOpacity="0.18" />
            <stop offset="50%" stopColor="#1D4ED8" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0" />
        </radialGradient>
        {/* Panel inner glow */}
        <linearGradient id="panelGradL" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1E3A5F" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0D1422" stopOpacity="0" />
        </linearGradient>
    </defs>
);

/* ─── reusable: sparkle / crosshair decoration ──────────────────────────────── */
const Sparkle = ({ cx, cy, size = 10, color = '#ffffff' }: { cx: number; cy: number; size?: number; color?: string }) => (
    <g>
        <line x1={cx} y1={cy - size} x2={cx} y2={cy + size} stroke={color} strokeWidth="1.5" opacity="0.7" />
        <line x1={cx - size} y1={cy} x2={cx + size} y2={cy} stroke={color} strokeWidth="1.5" opacity="0.7" />
        <line x1={cx - size * .55} y1={cy - size * .55} x2={cx + size * .55} y2={cy + size * .55} stroke={color} strokeWidth="0.8" opacity="0.4" />
        <line x1={cx + size * .55} y1={cy - size * .55} x2={cx - size * .55} y2={cy + size * .55} stroke={color} strokeWidth="0.8" opacity="0.4" />
    </g>
);

/* ─── reusable: rounded panel ────────────────────────────────────────────────── */
const Panel = ({ x, y, w, h, rx = 10, borderColor = '#1E3A5F', glowColor = '#0EA5E9' }:
    { x: number; y: number; w: number; h: number; rx?: number; borderColor?: string; glowColor?: string }) => (
    <g>
        <rect x={x} y={y} width={w} height={h} rx={rx} fill="#0D1422" stroke={borderColor} strokeWidth="1.3" />
        <rect x={x} y={y} width={w} height={h} rx={rx} fill="none" stroke={glowColor} strokeWidth="0.8" opacity="0.45" filter="url(#glow2)" />
        <rect x={x} y={y} width={w} height={h} rx={rx} fill="url(#panelGradL)" />
    </g>
);

/* ─── reusable: window chrome ────────────────────────────────────────────────── */
const WindowChrome = ({ x, y, w }: { x: number; y: number; w: number }) => (
    <g>
        <rect x={x} y={y} width={w} height={20} rx={8} fill="#161D2E" />
        <rect x={x} y={y + 12} width={w} height={8} fill="#161D2E" />
        <circle cx={x + 13} cy={y + 10} r={3.8} fill="#FF5F56" />
        <circle cx={x + 24} cy={y + 10} r={3.8} fill="#FFBD2E" />
        <circle cx={x + 35} cy={y + 10} r={3.8} fill="#27C93F" />
    </g>
);

/* ─── reusable: gear ─────────────────────────────────────────────────────────── */
const Gear = ({ cx, cy, outerR, innerR, teethCount, toothH, toothW, rotate = 0, strokeColor = '#1E3A5F', glowColor = '#0EA5E9', opacity = 1 }:
    { cx: number; cy: number; outerR: number; innerR: number; teethCount: number; toothH: number; toothW: number; rotate?: number; strokeColor?: string; glowColor?: string; opacity?: number }) => {
    const angles = Array.from({ length: teethCount }, (_, i) => i * (360 / teethCount));
    return (
        <g opacity={opacity}>
            <circle cx={cx} cy={cy} r={outerR} fill="none" stroke={strokeColor} strokeWidth={outerR * 0.22} />
            <circle cx={cx} cy={cy} r={outerR} fill="none" stroke={glowColor} strokeWidth="0.8" opacity="0.5" filter="url(#glow2)" />
            <circle cx={cx} cy={cy} r={innerR} fill="#0A1020" stroke={strokeColor} strokeWidth={innerR * 0.35} />
            <circle cx={cx} cy={cy} r={innerR} fill="none" stroke={glowColor} strokeWidth="0.7" opacity="0.45" />
            {angles.map((a, i) => (
                <rect
                    key={i}
                    x={cx - toothW / 2}
                    y={cy - outerR - toothH}
                    width={toothW}
                    height={toothH}
                    rx="2"
                    fill={strokeColor}
                    stroke={glowColor}
                    strokeWidth="0.6"
                    opacity="0.8"
                    transform={`rotate(${a + rotate} ${cx} ${cy})`}
                />
            ))}
        </g>
    );
};

/* ─── reusable: chevron row ──────────────────────────────────────────────────── */
const ChevronRow = ({ x, y, count, dir, size, gap, color, strokeW, opacity = 1 }:
    { x: number; y: number; count: number; dir: 'right' | 'left'; size: number; gap: number; color: string; strokeW: number; opacity?: number }) => (
    <g opacity={opacity}>
        {Array.from({ length: count }, (_, i) => {
            const cx = dir === 'right' ? x + i * gap : x - i * gap;
            const pts = dir === 'right'
                ? `${cx - size},${y - size} ${cx},${y} ${cx - size},${y + size}`
                : `${cx + size},${y - size} ${cx},${y} ${cx + size},${y + size}`;
            return <polyline key={i} points={pts} stroke={color} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round" fill="none" />;
        })}
    </g>
);

/* ═══════════════════════════════════════════════════════════════════════════════
   LEFT DECORATION
   ═══════════════════════════════════════════════════════════════════════════════ */
const LeftDecoration: React.FC = () => {
    const CODE = [
        { n: 1, color: '#10B981', text: '<html>' },
        { n: 2, color: '#3B82F6', text: '  <head name="content">' },
        { n: 3, color: '#10B981', text: '    <div class="Frog.../Utils">' },
        { n: 4, color: '#6B7280', text: '    <docnoe' },
        { n: 5, color: '#10B981', text: '    #GetFormComponent>' },
        { n: 6, color: '#3B82F6', text: '      <docsel' },
        { n: 7, color: '#6B7280', text: '      root ComponentBuildBoss' },
        { n: 8, color: '#3B82F6', text: '      <title ver="app/dialog/6.4>(1)>' },
        { n: 9, color: '#10B981', text: '      </' },
        { n: 10, color: '#6B7280', text: '      #prop-ast prepout >' },
        { n: 11, color: '#10B981', text: '    </pmom>' },
        { n: 12, color: '#3B82F6', text: '    </latody>' },
        { n: 13, color: '#10B981', text: '</html>' },
    ];

    const CODE2 = [
        { color: '#6B7280', w: 70 },
        { color: '#10B981', w: 90 },
        { color: '#3B82F6', w: 60 },
        { color: '#10B981', w: 80 },
        { color: '#8B5CF6', w: 55 },
        { color: '#3B82F6', w: 75 },
        { color: '#6B7280', w: 50 },
    ];

    return (
        <svg
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[370px] pointer-events-none select-none"
            viewBox="0 0 370 620"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
        >
            {SVG_DEFS}

            {/* Ambient glow */}
            <ellipse cx="160" cy="310" rx="230" ry="310" fill="url(#leftAmbient)" />

            {/* ── dot grid (upper area) ─────────────────────────────────────────── */}
            {Array.from({ length: 6 }, (_, r) =>
                Array.from({ length: 8 }, (_, c) => (
                    <circle key={`${r}-${c}`} cx={163 + c * 12} cy={55 + r * 12} r={1.5} fill="#4B5563" opacity={0.6 - r * 0.08} />
                ))
            )}

            {/* ── main code editor panel (slightly tilted) ─────────────────────── */}
            <g transform="rotate(-4 148 220)">
                <Panel x={18} y={90} w={248} h={230} rx={9} />
                <WindowChrome x={18} y={90} w={248} />
                {/* line numbers column bg */}
                <rect x={18} y={110} width={22} height={210} fill="#0A1020" opacity={0.6} />
                {CODE.map(({ n, color, text }, i) => (
                    <g key={n}>
                        <text x={24} y={124 + i * 15.8} fontSize={6.5} fill="#4B5563" fontFamily="monospace">{n}</text>
                        <text x={44} y={124 + i * 15.8} fontSize={6.5} fill={color} fontFamily="monospace" opacity={0.88}>{text}</text>
                    </g>
                ))}
            </g>

            {/* ── second smaller code panel (lower, overlapping) ───────────────── */}
            <g transform="rotate(-2 188 370)">
                <Panel x={118} y={318} w={168} h={128} rx={8} />
                <WindowChrome x={118} y={318} w={168} />
                {CODE2.map(({ color, w }, i) => (
                    <rect key={i} x={130} y={340 + i * 14.5} width={w} height={6} rx={2} fill={color} opacity={0.65} />
                ))}
            </g>

            {/* ── secondary narrow panel (left edge, partially off-screen) ─────── */}
            <g transform="rotate(-1 12 295)">
                <Panel x={-22} y={190} w={82} h={215} rx={7} />
                {/* white dot indicator */}
                <circle cx={13} cy={270} r={6} fill="#FFFFFF" opacity={0.88} />
                {/* small dot cluster */}
                {[0, 1, 2].map(r =>
                    [0, 1, 2].map(c => (
                        <circle key={`${r}-${c}`} cx={8 + c * 10} cy={295 + r * 10} r={2} fill="#3B82F6" opacity={0.4 + r * 0.1} />
                    ))
                )}
                {/* stub bars */}
                {[40, 55, 30, 48, 35].map((w, i) => (
                    <rect key={i} x={5} y={330 + i * 13} width={w} height={5} rx={2}
                        fill={['#10B981', '#3B82F6', '#6B7280', '#10B981', '#3B82F6'][i]} opacity={0.6} />
                ))}
            </g>

            {/* ── >> chevrons (2 rows, pointing right) ─────────────────────────── */}
            <ChevronRow x={215} y={262} count={4} dir="right" size={12} gap={17} color="#10B981" strokeW={3.2} />
            <ChevronRow x={220} y={286} count={4} dir="right" size={10} gap={15} color="#10B981" strokeW={2.2} opacity={0.5} />

            {/* ── large gear (inside ornate panel, bottom-left) ─────────────────── */}
            <Panel x={2} y={420} w={128} h={128} rx={12} />
            {/* decorative teal lines inside gear panel */}
            <line x1={66} y1={422} x2={66} y2={548} stroke="#0EA5E9" strokeWidth={0.6} opacity={0.2} />
            <line x1={2} y1={484} x2={130} y2={484} stroke="#0EA5E9" strokeWidth={0.6} opacity={0.2} />
            <Gear cx={66} cy={484} outerR={44} innerR={17} teethCount={9} toothH={14} toothW={11} rotate={8}
                strokeColor="#1E3A5F" glowColor="#0EA5E9" />
            {/* center cross detail */}
            <line x1={60} y1={484} x2={72} y2={484} stroke="#0EA5E9" strokeWidth={1.5} opacity={0.7} />
            <line x1={66} y1={478} x2={66} y2={490} stroke="#0EA5E9" strokeWidth={1.5} opacity={0.7} />

            {/* ── medium standalone gear ────────────────────────────────────────── */}
            <Gear cx={185} cy={470} outerR={32} innerR={12} teethCount={8} toothH={11} toothW={9} rotate={-15}
                strokeColor="#1E3A5F" glowColor="#06B6D4" opacity={0.75} />

            {/* ── bar chart (bottom center) ─────────────────────────────────────── */}
            <g transform="translate(135 455)">
                {[32, 50, 22, 44, 60, 36, 48, 28].map((barH, i) => (
                    <rect key={i} x={i * 12} y={75 - barH} width={9} height={barH} rx={2.5}
                        fill={i % 2 === 0 ? '#10B981' : '#06B6D4'} opacity={0.75} />
                ))}
            </g>

            {/* ── circuit traces ────────────────────────────────────────────────── */}
            {/* right of main panel to chevrons */}
            <polyline points="268,248 310,248 310,262 340,262" stroke="#10B981" strokeWidth={1.2} opacity={0.5} fill="none" strokeDasharray="5 3" />
            <circle cx={310} cy={248} r={3} fill="#10B981" opacity={0.7} />
            {/* lower circuit */}
            <polyline points="130,480 160,480 160,530 200,530" stroke="#06B6D4" strokeWidth={1} opacity={0.4} fill="none" strokeDasharray="5 3" />
            <circle cx={160} cy={480} r={2.5} fill="#06B6D4" opacity={0.6} />
            {/* extra traces */}
            <polyline points="260,350 320,350 320,380 360,380" stroke="#10B981" strokeWidth={0.8} opacity={0.35} fill="none" strokeDasharray="4 3" />
            <circle cx={320} cy={350} r={2} fill="#10B981" opacity={0.5} />

            {/* ── sparkle / plus decorations ────────────────────────────────────── */}
            <Sparkle cx={14} cy={260} size={9} color="#ffffff" />
            <Sparkle cx={252} cy={92} size={7} color="#06B6D4" />
            <Sparkle cx={340} cy={155} size={5} color="#3B82F6" />

            {/* floating particles */}
            <circle cx={355} cy={290} r={2.5} fill="#3B82F6" opacity={0.5} />
            <circle cx={275} cy={420} r={2} fill="#10B981" opacity={0.45} />
            <circle cx={300} cy={540} r={2} fill="#06B6D4" opacity={0.4} />
        </svg>
    );
};

/* ═══════════════════════════════════════════════════════════════════════════════
   RIGHT DECORATION
   ═══════════════════════════════════════════════════════════════════════════════ */
const RightDecoration: React.FC = () => {
    // Brain path centered at 0,0
    const brainPath = `
    M 0,-56
    C -10,-59 -22,-54 -27,-45
    C -38,-48 -52,-37 -52,-22
    C -52,-8 -42,3 -30,7
    C -38,16 -38,30 -30,38
    C -22,46 -10,48 0,44
    C 10,48 22,46 30,38
    C 38,30 38,16 30,7
    C 42,3 52,-8 52,-22
    C 52,-37 38,-48 27,-45
    C 22,-54 10,-59 0,-56 Z
  `;

    const CHART_BARS = [28, 44, 18, 38, 52, 30, 42];

    return (
        <svg
            className="absolute right-0 top-1/2 -translate-y-1/2 w-[365px] pointer-events-none select-none"
            viewBox="0 0 365 620"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
        >
            {SVG_DEFS}

            {/* Ambient glow */}
            <ellipse cx="210" cy="305" rx="220" ry="305" fill="url(#rightAmbient)" />

            {/* ── git / PR diagram panel (upper center-right) ────────────────────── */}
            <g transform="rotate(3 222 152)">
                <Panel x={168} y={92} w={125} h={128} rx={10} />
                {/* git branch lines */}
                <line x1={210} y1={114} x2={210} y2={196} stroke="#10B981" strokeWidth={2} opacity={0.7} />
                <line x1={262} y1={114} x2={262} y2={160} stroke="#3B82F6" strokeWidth={2} opacity={0.7} />
                {/* branch merge arc */}
                <path d="M 262 160 C 262 180 210 178 210 196" stroke="#10B981" strokeWidth={1.8} fill="none" opacity={0.65} />
                {/* commit circles */}
                <circle cx={210} cy={114} r={8} fill="#0D1422" stroke="#10B981" strokeWidth={2.2} />
                <circle cx={210} cy={114} r={3.5} fill="#10B981" />
                <circle cx={262} cy={114} r={8} fill="#0D1422" stroke="#3B82F6" strokeWidth={2.2} />
                <circle cx={262} cy={114} r={3.5} fill="#3B82F6" />
                {/* mid-commit */}
                <circle cx={210} cy={155} r={7} fill="#0D1422" stroke="#10B981" strokeWidth={2} />
                <circle cx={210} cy={155} r={3} fill="#10B981" />
                {/* merge/end circle */}
                <circle cx={210} cy={196} r={7} fill="#0D1422" stroke="#10B981" strokeWidth={2} />
                <circle cx={210} cy={196} r={3} fill="#10B981" />
                {/* return-arrow icon on right branch */}
                <path d="M 275 130 C 275 120 265 115 258 118" stroke="#3B82F6" strokeWidth={1.5} fill="none" strokeLinecap="round" />
                <polyline points="254,115 258,118 258,122" stroke="#3B82F6" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </g>

            {/* ── green checkmark badge (left of git panel) ─────────────────────── */}
            <g transform="rotate(-2 125 178)">
                <rect x={98} y={155} width={56} height={56} rx={12} fill="#22C55E" opacity={0.88} />
                <polyline points="112,183 122,193 144,169" stroke="#fff" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </g>

            {/* ── shield + check panel (center-right of checkmark) ─────────────── */}
            <g transform="rotate(2 178 165)">
                <Panel x={150} y={138} w={80} h={80} rx={10} />
                {/* shield path */}
                <path d="M 190 150 L 218 159 L 218 176 C 218 188 204 196 190 200 C 176 196 162 188 162 176 L 162 159 Z"
                    fill="#1E40AF" fillOpacity={0.2} stroke="#3B82F6" strokeWidth={1.8} />
                {/* checkmark in shield */}
                <polyline points="182,174 188,180 200,166" stroke="#3B82F6" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </g>

            {/* ── second shield panel (right edge area) ────────────────────────── */}
            <g transform="rotate(3 258 152)">
                <Panel x={228} y={120} w={78} h={78} rx={10} />
                <path d="M 267 132 L 292 139 L 292 155 C 292 165 279 172 267 176 C 255 172 242 165 242 155 L 242 139 Z"
                    fill="#1E40AF" fillOpacity={0.2} stroke="#3B82F6" strokeWidth={1.8} />
                <polyline points="259,153 265,159 276,146" stroke="#10B981" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </g>

            {/* ── brain panel (large, center) ────────────────────────────────────── */}
            <g transform="rotate(-2 192 290)">
                <Panel x={105} y={195} w={178} h={192} rx={12} />
                {/* brain illustration centered at (194, 291) */}
                <g transform="translate(194 291)" filter="url(#glow5)">
                    {/* brain fill */}
                    <path d={brainPath} fill="#0EA5E9" fillOpacity={0.07} stroke="#0EA5E9" strokeWidth={2} />
                    {/* center vertical divider */}
                    <line x1={0} y1={-54} x2={0} y2={41} stroke="#0EA5E9" strokeWidth={1} opacity={0.55} strokeDasharray="3 2" />
                    {/* fold lines */}
                    <path d="M -42,-18 C -22,-28 22,-28 42,-18" stroke="#0EA5E9" strokeWidth={1.3} fill="none" opacity={0.65} />
                    <path d="M -48,4 C -26,-7 26,-7 48,4" stroke="#0EA5E9" strokeWidth={1.2} fill="none" opacity={0.6} />
                    <path d="M -38,26 C -20,17 20,17 38,26" stroke="#0EA5E9" strokeWidth={1.1} fill="none" opacity={0.5} />
                    {/* left lobe inner fold */}
                    <path d="M -42,-4 C -33,-12 -18,-12 -12,-4" stroke="#0EA5E9" strokeWidth={1} fill="none" opacity={0.5} />
                    {/* right lobe inner fold */}
                    <path d="M 12,-4 C 18,-12 33,-12 42,-4" stroke="#0EA5E9" strokeWidth={1} fill="none" opacity={0.5} />
                </g>
                {/* neural nodes + connection lines */}
                {[
                    [-60, 0], [-52, -37], [-22, -62], [22, -62], [52, -37], [60, 0], [46, 40], [-46, 40]
                ].map(([dx, dy], i) => (
                    <g key={i} transform={`translate(194 291)`}>
                        <line x1={0} y1={0} x2={dx} y2={dy} stroke="#0EA5E9" strokeWidth={0.8} opacity={0.28} />
                        <circle cx={dx} cy={dy} r={5} fill="#0EA5E9" fillOpacity={0.15} stroke="#0EA5E9" strokeWidth={1.5} />
                        <circle cx={dx} cy={dy} r={2} fill="#0EA5E9" opacity={0.75} />
                    </g>
                ))}
                {/* center node */}
                <circle cx={194} cy={291} r={6} fill="#0EA5E9" fillOpacity={0.15} stroke="#0EA5E9" strokeWidth={1.5} />
                <circle cx={194} cy={291} r={2.5} fill="#0EA5E9" />
            </g>

            {/* ── "AI" gear badge (right, partially cut off) ───────────────────── */}
            <g transform="rotate(2 315 262)">
                <Panel x={290} y={228} w={80} h={72} rx={10} />
                {/* gear icon */}
                <Gear cx={330} cy={258} outerR={22} innerR={9} teethCount={8} toothH={8} toothW={8} rotate={5}
                    strokeColor="#1E3A5F" glowColor="#10B981" />
                <text x={330} y={262} textAnchor="middle" fontSize={10} fontWeight="900" fill="#10B981" fontFamily="monospace" opacity={0.85}>AI</text>
            </g>

            {/* ── automation panel (lower center) ──────────────────────────────── */}
            <g transform="rotate(1 192 402)">
                <Panel x={118} y={370} w={156} h={78} rx={12} glowColor="#F59E0B" />
                {/* gear + lightning bolt icon */}
                <Gear cx={150} cy={408} outerR={22} innerR={9} teethCount={8} toothH={7} toothW={8} rotate={12}
                    strokeColor="#374151" glowColor="#0EA5E9" />
                {/* lightning bolt */}
                <path d="M 155 392 L 147 406 L 152 406 L 145 422 L 158 406 L 152 406 Z"
                    fill="#F59E0B" opacity={0.9} />
                <text x={200} y={402} fontSize={11} fill="#D1D5DB" fontFamily="sans-serif" fontWeight="700">Automation</text>
                <text x={200} y={418} fontSize={8} fill="#6B7280" fontFamily="sans-serif">CI/CD Pipeline</text>
                {/* status dots */}
                {[0, 1, 2, 3].map(i => (
                    <circle key={i} cx={184 + i * 12} cy={430} r={3} fill={i % 2 === 0 ? '#10B981' : '#3B82F6'} opacity={0.7} />
                ))}
            </g>

            {/* ── small dashboard / code panel (lower right) ───────────────────── */}
            <g transform="rotate(3 300 400)">
                <Panel x={232} y={350} w={132} h={120} rx={8} />
                <WindowChrome x={232} y={350} w={132} />
                {/* code lines */}
                {CHART_BARS.map((barH, i) => (
                    <rect key={i} x={240} y={373 + i * 11} width={barH + 28} height={6} rx={2}
                        fill={['#10B981', '#3B82F6', '#10B981', '#8B5CF6', '#10B981', '#3B82F6', '#6B7280'][i]}
                        opacity={0.68} />
                ))}
                {/* purple loading bars at bottom (like the screenshot's lavender bars) */}
                {[70, 50, 85, 40].map((w, i) => (
                    <rect key={i} x={240} y={452 + i * 7} width={w} height={4} rx={2} fill="#8B5CF6" opacity={0.5} />
                ))}
            </g>

            {/* ── << chevrons (2 rows, pointing left) ──────────────────────────── */}
            <ChevronRow x={140} y={302} count={4} dir="left" size={12} gap={17} color="#10B981" strokeW={3.2} />
            <ChevronRow x={135} y={325} count={4} dir="left" size={10} gap={15} color="#10B981" strokeW={2.2} opacity={0.5} />

            {/* ── circuit board traces ─────────────────────────────────────────── */}
            {/* from brain left to chevrons */}
            <polyline points="105,291 72,291 72,302 52,302" stroke="#10B981" strokeWidth={1.2} opacity={0.5} fill="none" strokeDasharray="5 3" />
            <circle cx={72} cy={291} r={3} fill="#10B981" opacity={0.7} />
            {/* connecting git panel down */}
            <polyline points="168,218 125,218 125,240 95,240" stroke="#10B981" strokeWidth={1} opacity={0.45} fill="none" strokeDasharray="5 3" />
            <circle cx={125} cy={218} r={2.5} fill="#10B981" opacity={0.65} />
            {/* automation to lower */}
            <polyline points="118,408 85,408 85,450 55,450" stroke="#06B6D4" strokeWidth={1} opacity={0.4} fill="none" strokeDasharray="5 3" />
            <circle cx={85} cy={408} r={2.5} fill="#06B6D4" opacity={0.6} />
            {/* from brain right to AI badge */}
            <polyline points="283,268 290,268" stroke="#10B981" strokeWidth={1} opacity={0.45} fill="none" strokeDasharray="4 3" />
            {/* right-side horizontal circuit band */}
            <polyline points="340,195 355,195 355,330 340,330" stroke="#0EA5E9" strokeWidth={0.8} opacity={0.3} fill="none" strokeDasharray="4 3" />

            {/* ── bottom decorative circles ─────────────────────────────────────── */}
            <circle cx={92} cy={500} r={12} fill="none" stroke="#1E3A5F" strokeWidth={1.5} opacity={0.5} />
            <circle cx={92} cy={500} r={5} fill="none" stroke="#0EA5E9" strokeWidth={0.8} opacity={0.4} />
            <circle cx={120} cy={512} r={5} fill="none" stroke="#1E3A5F" strokeWidth={1.2} opacity={0.45} />

            {/* ── sparkle decorations ───────────────────────────────────────────── */}
            <Sparkle cx={130} cy={165} size={8} color="#06B6D4" />
            <Sparkle cx={130} cy={370} size={7} color="#06B6D4" />
            <Sparkle cx={280} cy={88} size={6} color="#3B82F6" />

            {/* floating particles */}
            <circle cx={55} cy={195} r={2.5} fill="#3B82F6" opacity={0.5} />
            <circle cx={88} cy={140} r={2} fill="#10B981" opacity={0.5} />
            <circle cx={345} cy={490} r={2.5} fill="#8B5CF6" opacity={0.45} />
            <circle cx={62} cy={555} r={2} fill="#06B6D4" opacity={0.4} />
        </svg>
    );
};

/* ═══════════════════════════════════════════════════════════════════════════════
   AUTH PAGE
   ═══════════════════════════════════════════════════════════════════════════════ */
export const AuthPage: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Handle error codes redirected back from the OAuth callback
    useEffect(() => {
        const error = searchParams.get('error');
        if (error === 'access_denied') setErrorMsg('GitHub access was denied. Please try again.');
        else if (error === 'session_expired') setErrorMsg('Session expired. Please try again.');
        else if (error === 'auth_failed') setErrorMsg('Authentication failed. Please try again.');
        else if (error === 'invalid_callback') setErrorMsg('Invalid callback. Please try again.');
    }, [searchParams]);

    useEntrance(containerRef);

    const handleGitHubAuth = () => {
        setIsLoading(true);
        setErrorMsg(null);
        // Redirect browser to backend — backend sets cookie + redirects to GitHub
        window.location.href = `${BACKEND_URL}/api/auth/github`;
    };


    return (
        <div
            ref={containerRef}
            className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white to-[#F0F2F5] text-[#111827] font-['Inter'] flex flex-col relative overflow-y-auto overflow-x-hidden"
        >
            {/* Background decorations */}
            <LeftDecoration />
            <RightDecoration />

            {/* ── Header ── */}
            <header className="w-full py-6 px-8 flex justify-start items-center absolute top-0 left-0 bg-transparent z-10">
                <button
                    onClick={() => navigate('/')}
                    className="hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 rounded"
                    aria-label="Homepage"
                >
                    <img src={lightLogoImg} alt="Velocis" className="h-8 w-auto object-contain" />
                </button>
            </header>

            {/* ── Main ── */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center pt-20 pb-8 px-4">

                {/* Headlines */}
                <div className="max-w-[700px] text-center mb-6 fade-up">
                    <h1 className="text-[38px] leading-[1.1] font-extrabold tracking-tight text-[#111827] mb-3">
                        Let Your Repo Meet<br />Its Senior Engineer
                    </h1>
                    <p className="text-[15px] text-[#4B5563] leading-relaxed max-w-[550px] mx-auto">
                        Velocis connects securely to your GitHub to analyze code, monitor changes, and
                        operate autonomously. No passwords. No manual setup. Just OAuth.
                    </p>
                </div>

                {/* Auth Card */}
                <div className="fade-up w-full max-w-[500px] bg-gradient-to-b from-[#374151]/95 to-[#1F2937]/95 backdrop-blur-3xl rounded-[24px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] border border-white/10 flex flex-col overflow-hidden text-left">

                    <div className="w-full py-4 border-b border-white/5 bg-white/5 flex items-center justify-center gap-2">
                        <Github size={18} className="text-white" aria-hidden />
                        <span className="text-white font-semibold text-[14px]">GitHub Verified Connection</span>
                    </div>

                    <div className="p-6 pb-5 flex flex-col">
                        {/* Error Banner */}
                        {errorMsg && (
                            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-[10px] px-4 py-3 mb-4">
                                <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                                <span className="text-red-300 text-[12px]">{errorMsg}</span>
                            </div>
                        )}
                        <button
                            onClick={handleGitHubAuth}
                            disabled={isLoading}
                            aria-busy={isLoading}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#22C55E] to-[#10B981] hover:from-[#16A34A] hover:to-[#059669] disabled:opacity-70 text-white py-3.5 rounded-[12px] font-semibold text-[16px] transition-all duration-300 relative overflow-hidden group shadow-[0_8px_20px_-6px_rgba(16,185,129,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                        >
                            {isLoading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <><Github size={20} aria-hidden /> Connect with GitHub</>
                            )}
                            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />
                        </button>

                        <p className="text-center text-[#9CA3AF] text-[11px] mt-3 mb-5 leading-relaxed px-4">
                            We only request permissions required to review code, run tests, and monitor pull requests.
                        </p>

                        <div className="mb-2">
                            <h2 className="text-white font-semibold text-[13px] mb-3">Velocis will be able to:</h2>
                            <ul className="space-y-2.5" aria-label="Requested permissions">
                                {PERMISSIONS.map((item) => (
                                    <li key={item} className="flex items-center gap-3">
                                        <Check size={14} strokeWidth={3} className="text-[#10B981] shrink-0" aria-hidden />
                                        <span className="text-[#D1D5DB] text-[13px]">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="flex items-center justify-center gap-5 mt-6 mb-1">
                            {[{ label: 'Autonomous', color: '#10B981' }, { label: 'Secure', color: '#10B981' }, { label: 'Production-Ready', color: '#8B5CF6' }].map(({ label, color }) => (
                                <div key={label} className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} aria-hidden />
                                    <span className="text-white font-medium text-[13px]">{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-black/20 backdrop-blur-md py-3 px-6 text-center border-t border-white/5">
                        <p className="text-[#6B7280] text-[10px]">
                            Velocis operates only where you have access. You remain in control at all times.
                        </p>
                    </div>
                </div>

                {/* Footer nav */}
                <nav className="mt-6 text-[#6B7280] text-[11px] flex items-center gap-3 fade-up" aria-label="Footer">
                    {['Privacy', 'Security', 'GitHub Permissions Info', 'Contact'].map((link, i, arr) => (
                        <React.Fragment key={link}>
                            <button
                                onClick={() => navigate(`/${link.toLowerCase().replace(/\s+/g, '-')}`)}
                                className="hover:text-gray-900 transition-colors focus-visible:outline-none focus-visible:underline"
                            >
                                {link}
                            </button>
                            {i < arr.length - 1 && <span aria-hidden>•</span>}
                        </React.Fragment>
                    ))}
                </nav>
            </main>

            <style>{`
        @keyframes shimmer { 100% { transform: translateX(100%); } }
      `}</style>
        </div>
    );
};

export default AuthPage;