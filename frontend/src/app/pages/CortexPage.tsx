"use client";

import { useState, useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, MapControls, Grid, RoundedBox, Text } from '@react-three/drei';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft, Search, Shield, TestTube2, Eye, RefreshCw,
  Maximize2, Camera, Target, RotateCcw, Grid3x3, AlertCircle,
  CheckCircle, ChevronRight, Sun, Moon, AlertTriangle, Loader2,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import * as THREE from 'three';

/* ═══════════════════════════════════════════
   DATA
═══════════════════════════════════════════ */
interface Service {
  id: number; name: string; status: 'healthy' | 'warning' | 'critical';
  layer: 'edge' | 'compute' | 'data';
  pos: [number, number, number]; // 3D world position (x, y=height, z)
  connections: number[];
  p95: string; errRate: string; sparkline: number[];
  tests: number; errors: number; deployment: string;
}

const services: Service[] = [
  { id: 1, name: 'auth-service', status: 'healthy', layer: 'edge', pos: [-8, 0.3, -4], connections: [2, 3], p95: '38ms', errRate: '0.0%', sparkline: [60, 75, 65], tests: 100, errors: 0, deployment: '2h ago' },
  { id: 2, name: 'api-gateway', status: 'warning', layer: 'edge', pos: [-2, 0.3, -6], connections: [4, 5, 6], p95: '91ms', errRate: '3.2%', sparkline: [55, 80, 95], tests: 94, errors: 4, deployment: '3h ago' },
  { id: 3, name: 'user-db', status: 'healthy', layer: 'data', pos: [-8, 0.3, 6], connections: [], p95: '12ms', errRate: '0.0%', sparkline: [40, 42, 38], tests: 100, errors: 0, deployment: '1d ago' },
  { id: 4, name: 'payment-service', status: 'warning', layer: 'compute', pos: [4, 0.3, -5], connections: [7], p95: '74ms', errRate: '2.1%', sparkline: [50, 68, 74], tests: 94, errors: 2, deployment: '30m ago' },
  { id: 5, name: 'notification-svc', status: 'healthy', layer: 'compute', pos: [4, 0.3, 1], connections: [8], p95: '29ms', errRate: '0.0%', sparkline: [30, 28, 32], tests: 100, errors: 0, deployment: '5h ago' },
  { id: 6, name: 'analytics-service', status: 'critical', layer: 'compute', pos: [4, 0.3, 6], connections: [9], p95: '820ms', errRate: '14.3%', sparkline: [45, 72, 100], tests: 85, errors: 12, deployment: '15m ago' },
  { id: 7, name: 'stripe-api', status: 'healthy', layer: 'edge', pos: [10, 0.3, -5], connections: [], p95: '55ms', errRate: '0.0%', sparkline: [55, 57, 54], tests: 100, errors: 0, deployment: '1d ago' },
  { id: 8, name: 'email-queue', status: 'healthy', layer: 'data', pos: [10, 0.3, 1], connections: [], p95: '8ms', errRate: '0.0%', sparkline: [20, 22, 19], tests: 100, errors: 0, deployment: '6h ago' },
  { id: 9, name: 'postgres-db', status: 'healthy', layer: 'data', pos: [10, 0.3, 6], connections: [], p95: '15ms', errRate: '0.0%', sparkline: [42, 40, 44], tests: 100, errors: 0, deployment: '2d ago' },
];

const BLAST_PAIRS = new Set(['2-6', '6-9']);
const CRITICAL_ID = 6;

const timelineEvents = [
  { position: 7, label: 'Deploy v2.0', color: '#22c55e' },
  { position: 19, label: 'Sentinel Scan', color: '#8b5cf6' },
  { position: 33, label: 'Deploy v2.1', color: '#22c55e' },
  { position: 47, label: 'Sentinel Scan', color: '#8b5cf6' },
  { position: 60, label: 'Anomaly Detected', color: '#ef4444' },
  { position: 71, label: 'Sentinel Scan', color: '#8b5cf6' },
  { position: 82, label: 'Rollback Initiated', color: '#f59e0b' },
  { position: 91, label: 'analytics-service CRIT', color: '#ef4444' },
];

const STATUS: Record<string, { dot: string; label: string; bg: string; text: string }> = {
  healthy: { dot: '#22c55e', label: 'Healthy', bg: 'rgba(34,197,94,0.10)', text: '#22c55e' },
  warning: { dot: '#f59e0b', label: 'Degraded', bg: 'rgba(245,158,11,0.10)', text: '#f59e0b' },
  critical: { dot: '#ef4444', label: 'Failed', bg: 'rgba(239,68,68,0.10)', text: '#ef4444' },
};

/* ═══════════════════════════════════════════
   Sparkline
═══════════════════════════════════════════ */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[2px]" style={{ height: 14 }}>
      {data.map((v, i) => (
        <div key={i} style={{ width: 5, height: `${(v / max) * 14}px`, backgroundColor: color, opacity: 0.85, borderRadius: 1 }} />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   3D SERVICE NODE
═══════════════════════════════════════════ */
function ServiceNode({
  svc, isDark, isSelected, onSelect, filters
}: {
  svc: Service; isDark: boolean; isSelected: boolean;
  onSelect: (id: number | null) => void;
  filters: { sentinel: boolean; fortress: boolean; cortex: boolean };
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);
  const boxMatRef = useRef<THREE.MeshStandardMaterial>(null!);
  const [hovered, setHovered] = useState(false);

  const isCrit = svc.id === CRITICAL_ID;
  const isHealthy = svc.status === 'healthy';
  const cfg = STATUS[svc.status];
  const sparkC = svc.status === 'critical' ? '#ef4444' : svc.status === 'warning' ? '#f59e0b' : '#22c55e';

  // Dynamic parameters based on ID to group sizes
  const height = 0.4 + (svc.id % 3) * 0.4;

  // Materials that communicate state explicitly independent of Dark/Light for the 3D meshes
  const matColor = '#1e293b'; // sleek dark slate
  const emissiveColor = isCrit ? '#ef4444' : svc.status === 'warning' ? '#f59e0b' : '#10b981';
  const baseEmissiveIntensity = isCrit ? 1.5 : (hovered || isSelected) ? 0.8 : 0.2;

  // Animate the critical node glow pulsating and position
  useFrame((state) => {
    if (meshRef.current) {
      // Subtle float, accounting for dynamic height offset
      meshRef.current.position.y = (height / 2 - 0.25) + Math.sin(state.clock.elapsedTime * 0.8 + svc.id) * 0.06;
    }
    if (boxMatRef.current && isCrit) {
      // Pulse bright red emissive glow
      boxMatRef.current.emissiveIntensity = 2 + Math.sin(state.clock.elapsedTime * 4) * 1.5;
    }
    if (glowRef.current && isCrit) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 2.5) * 0.15;
      glowRef.current.scale.set(s, s, s);
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.12 + Math.sin(state.clock.elapsedTime * 2.5) * 0.08;
    }
  });

  return (
    <group position={[svc.pos[0], svc.pos[1], svc.pos[2]]}>
      {/* Critical glow sphere */}
      {isCrit && (
        <mesh ref={glowRef} position={[0, 0, 0]}>
          <sphereGeometry args={[2.5, 16, 16]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.12} depthWrite={false} />
        </mesh>
      )}

      {/* 3D Box */}
      <RoundedBox
        ref={meshRef}
        args={[3, height, 2]}
        radius={0.08}
        smoothness={4}
        castShadow
        receiveShadow
        onClick={(e) => { e.stopPropagation(); onSelect(isSelected ? null : svc.id); }}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; setHovered(true); }}
        onPointerOut={() => { document.body.style.cursor = 'default'; setHovered(false); }}
      >
        <meshStandardMaterial
          ref={boxMatRef}
          color={matColor}
          emissive={emissiveColor}
          emissiveIntensity={baseEmissiveIntensity}
          roughness={0.2}
          metalness={0.8}
        />
      </RoundedBox>

      {/* Selection ring */}
      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2, 2.15, 32]} />
          <meshBasicMaterial color={cfg.dot} transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* ── HTML OVERLAY (always billboard / face camera) ── */}
      <Html
        position={[0, height / 2 + 0.5, 0]}
        center
        distanceFactor={18}
        style={{ pointerEvents: 'auto', userSelect: 'none' }}
        transform={false}
      >
        <div
          className="relative transition-all"
          style={{ width: !isCrit && !hovered && !isSelected ? 'auto' : 150, fontFamily: "'Inter','Geist Sans',sans-serif" }}
          onClick={(e) => { e.stopPropagation(); onSelect(isSelected ? null : svc.id); }}
        >
          {!isCrit && !hovered && !isSelected ? (
            /* Hyper-minimalist Badge for unhovered healthy/warning nodes */
            <div
              className={`flex items-center gap-2 px-2 py-1 rounded-full border shadow-sm text-[10px] font-mono cursor-pointer transition-colors ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-white border-gray-200 text-gray-700'
                }`}
              style={{
                backgroundColor: isDark ? '#27272a' : '#ffffff',
                borderColor: isDark ? '#3f3f46' : '#e5e7eb',
                color: isDark ? '#d4d4d8' : '#374151'
              }}
              onPointerEnter={() => setHovered(true)}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: cfg.dot }} />
              {svc.name}
            </div>
          ) : (
            /* Full Detailed Card */
            <div
              style={{
                background: isDark ? 'rgba(14,17,23,0.92)' : 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(12px)',
                border: `1.5px solid ${isSelected ? cfg.dot : (isDark ? '#1e2535' : '#e5e7eb')}`,
                borderRadius: 8,
                padding: '10px 12px',
                boxShadow: isSelected
                  ? `0 0 0 2px ${cfg.dot}55, 0 6px 24px rgba(0,0,0,0.5)`
                  : isDark
                    ? '0 4px 16px rgba(0,0,0,0.5)'
                    : '0 4px 16px rgba(0,0,0,0.12)',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
              onPointerLeave={() => setHovered(false)}
            >
              {/* Name row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}`, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: isDark ? '#f1f5f9' : '#111827', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {svc.name}
                </span>
              </div>

              {/* Status */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 6px', borderRadius: 4, marginBottom: 8,
                backgroundColor: cfg.bg, color: cfg.text, fontSize: 9, fontWeight: 700,
              }}>
                {svc.status === 'critical' && <AlertCircle style={{ width: 9, height: 9 }} />}
                {svc.status === 'warning' && <AlertTriangle style={{ width: 9, height: 9 }} />}
                {svc.status === 'healthy' && <CheckCircle style={{ width: 9, height: 9 }} />}
                {cfg.label}
              </div>

              {/* Telemetry */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, fontFamily: 'monospace', color: isDark ? '#9ca3af' : '#6b7280', marginBottom: 6 }}>
                <span>p95 <strong style={{ color: isDark ? '#f8fafc' : '#111827' }}>{svc.p95}</strong></span>
                <span>err <strong style={{ color: cfg.text }}>{svc.errRate}</strong></span>
              </div>

              {/* Sparkline */}
              <Sparkline data={svc.sparkline} color={sparkC} />
            </div>
          )}

          {/* Fortress badge */}
          {isCrit && filters.fortress && (
            <div
              style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
                whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', borderRadius: 7, fontSize: 10, fontWeight: 600,
                backgroundColor: isDark ? 'rgba(120,53,15,0.95)' : '#fffbeb',
                border: `1px solid ${isDark ? 'rgba(245,158,11,0.5)' : '#fcd34d'}`,
                color: isDark ? '#fbbf24' : '#92400e',
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                zIndex: 10,
              }}
            >
              <Loader2 style={{ width: 11, height: 11, animation: 'spin 1s linear infinite' }} />
              Fortress: Rerouting…
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

/* ═══════════════════════════════════════════
   3D CONNECTIONS
═══════════════════════════════════════════ */
function Connections({ isDark }: { isDark: boolean }) {
  const lines = useMemo(() => {
    const result: { curve: THREE.QuadraticBezierCurve3; color: string; emissive: string; intensity: number; thickness: number }[] = [];
    services.forEach(svc => {
      svc.connections.forEach(tid => {
        const tgt = services.find(s => s.id === tid);
        if (!tgt) return;
        const key = `${svc.id}-${tid}`;
        const isBlast = BLAST_PAIRS.has(key);

        // Node heights to compute curve start/end
        const h0 = 0.4 + (svc.id % 3) * 0.4;
        const h1 = 0.4 + (tgt.id % 3) * 0.4;

        const top0 = svc.pos[1] + h0 - 0.2;
        const top1 = tgt.pos[1] + h1 - 0.2;

        const midX = (svc.pos[0] + tgt.pos[0]) / 2;
        const midZ = (svc.pos[2] + tgt.pos[2]) / 2;
        const dist = Math.hypot(svc.pos[0] - tgt.pos[0], svc.pos[2] - tgt.pos[2]);
        const archHeight = Math.max(top0, top1) + dist * 0.3 + 1.0;

        const start = new THREE.Vector3(svc.pos[0], top0, svc.pos[2]);
        const mid = new THREE.Vector3(midX, archHeight, midZ);
        const end = new THREE.Vector3(tgt.pos[0], top1, tgt.pos[2]);

        result.push({
          curve: new THREE.QuadraticBezierCurve3(start, mid, end),
          color: isBlast ? '#ef4444' : '#3b82f6',
          emissive: isBlast ? '#ef4444' : '#1d4ed8',
          intensity: isBlast ? 3.0 : 0.8,
          thickness: isBlast ? 0.1 : 0.04,
        });
      });
    });
    return result;
  }, []);

  return (
    <>
      {lines.map((l, i) => (
        <mesh key={i}>
          <tubeGeometry args={[l.curve, 32, l.thickness, 8, false]} />
          <meshStandardMaterial
            color={l.color}
            emissive={l.emissive}
            emissiveIntensity={l.intensity}
            transparent={true}
            opacity={l.color === '#ef4444' ? 1.0 : 0.4}
            roughness={0.2}
            metalness={0.8}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
}

/* ═══════════════════════════════════════════
   SENTINEL LASER (scanning plane)
═══════════════════════════════════════════ */
function SentinelLaser() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const matRef = useRef<THREE.MeshBasicMaterial>(null!);
  useFrame((state) => {
    if (meshRef.current && matRef.current) {
      const t = (state.clock.elapsedTime % 6) / 6;           // 6s period
      meshRef.current.position.x = THREE.MathUtils.lerp(-12, 14, t);
      matRef.current.opacity = t < 0.05 || t > 0.95 ? 0 : 0.18;
    }
  });
  return (
    <mesh ref={meshRef} position={[0, 3, 0]} rotation={[0, 0, 0]}>
      <planeGeometry args={[0.06, 14]} />
      <meshBasicMaterial ref={matRef} color="#8b5cf6" transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

/* ═══════════════════════════════════════════
   SWIMLANE PLATFORM
═══════════════════════════════════════════ */
function SwimlanePlatform({
  position, size, label, color, isDark,
}: {
  position: [number, number, number]; size: [number, number];
  label: string; color: string; isDark: boolean;
}) {
  const opacity = isDark ? 0.08 : 0.06;
  return (
    <group position={position}>
      {/* Glass plate */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={size} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          roughness={0.8}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Thick bottom edge */}
      <mesh position={[0, -0.05, size[1] / 2]}>
        <boxGeometry args={[size[0], 0.1, 0.08]} />
        <meshStandardMaterial color={color} transparent opacity={0.35} />
      </mesh>
      <mesh position={[0, -0.05, -size[1] / 2]}>
        <boxGeometry args={[size[0], 0.1, 0.08]} />
        <meshStandardMaterial color={color} transparent opacity={0.35} />
      </mesh>
      {/* Label embedded in floor */}
      <Text
        position={[0, 0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={1.8}
        color="#9ca3af"
        fillOpacity={0.2}
        letterSpacing={0.1}
        fontWeight="bold"
      >
        {label.toUpperCase()}
      </Text>
    </group>
  );
}

/* ═══════════════════════════════════════════
   3D SCENE (everything inside <Canvas>)
═══════════════════════════════════════════ */
function Scene({
  isDark, selectedNode, setSelectedNode, filters
}: {
  isDark: boolean; selectedNode: number | null;
  setSelectedNode: (id: number | null) => void;
  filters: { sentinel: boolean; fortress: boolean; cortex: boolean };
}) {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={isDark ? 0.4 : 0.6} />
      <directionalLight
        position={[8, 12, 6]}
        intensity={isDark ? 0.6 : 0.9}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <directionalLight position={[-6, 8, -4]} intensity={isDark ? 0.15 : 0.25} />

      {/* Grid floor */}
      <Grid
        position={[0, -0.01, 0]}
        cellSize={1}
        cellThickness={0.5}
        cellColor={isDark ? '#1a1f2e' : '#c0c4cc'}
        sectionSize={5}
        sectionThickness={1}
        sectionColor={isDark ? '#252d3d' : '#a0a4b0'}
        fadeDistance={30}
        fadeStrength={1.5}
        infiniteGrid
      />

      {/* Swimlane platforms */}
      <SwimlanePlatform position={[-1, 0, -5.5]} size={[22, 5]} label="Edge / Gateway" color="#6366f1" isDark={isDark} />
      <SwimlanePlatform position={[1.5, 0, 1]} size={[18, 6]} label="Compute Services" color="#10b981" isDark={isDark} />
      <SwimlanePlatform position={[1.5, 0, 6.5]} size={[22, 5]} label="Data / Persistence" color="#f59e0b" isDark={isDark} />

      {/* Connections */}
      <Connections isDark={isDark} />

      {/* Sentinel laser */}
      {filters.sentinel && <SentinelLaser />}

      {/* Service nodes */}
      {services.map(svc => (
        <ServiceNode
          key={svc.id}
          svc={svc}
          isDark={isDark}
          isSelected={selectedNode === svc.id}
          onSelect={setSelectedNode}
          filters={filters}
        />
      ))}

      {/* Map controls */}
      <MapControls
        enableDamping
        dampingFactor={0.12}
        maxPolarAngle={Math.PI / 2.3}
        minDistance={5}
        maxDistance={32}
        screenSpacePanning
      />
    </>
  );
}

/* ═══════════════════════════════════════════
   CSS
═══════════════════════════════════════════ */
const pageCSS = `
  @keyframes liveBlip { 0%,100%{opacity:1;} 50%{opacity:0.35;} }
  @keyframes spin { to { transform:rotate(360deg); } }
  .live-dot  { animation: liveBlip 1.1s ease-in-out infinite; }
  .iso-scroll::-webkit-scrollbar { width:5px; }
  .iso-scroll::-webkit-scrollbar-track { background:transparent; }
  .iso-scroll::-webkit-scrollbar-thumb { background:rgba(100,100,130,0.3); border-radius:6px; }
  .iso-scroll::-webkit-scrollbar-thumb:hover { background:rgba(100,100,130,0.6); }
`;

/* ═══════════════════════════════════════════
   MAIN PAGE COMPONENT
═══════════════════════════════════════════ */
export function CortexPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [view, setView] = useState<'graph' | 'service' | 'flow'>('graph');
  const [isDark, setIsDark] = useState(true);
  const [filters, setFilters] = useState({ sentinel: true, fortress: true, cortex: true });
  const [layers, setLayers] = useState({ microservices: true, apis: true, databases: true, external: true, queues: true });
  const [hoveredEvent, setHoveredEvent] = useState<number | null>(null);

  const repoName = id === 'infrazero' ? 'InfraZero' : id === 'immersa' ? 'Immersa' :
    id === 'velocis-core' ? 'velocis-core' : id === 'ai-observatory' ? 'ai-observatory' :
      id === 'distributed-lab' ? 'distributed-lab' : 'test-sandbox';

  const selectedService = selectedNode ? services.find(s => s.id === selectedNode) : null;

  const bg = isDark ? '#080a0f' : '#eef0f4';
  const panelBg = isDark ? 'rgba(10,12,18,0.97)' : 'rgba(255,255,255,0.97)';
  const border = isDark ? '#1a1f2e' : '#e5e7eb';
  const muted = isDark ? '#4b5563' : '#9ca3af';
  const text = isDark ? '#f1f5f9' : '#111827';

  return (
    <div className="w-full h-full" style={{ colorScheme: isDark ? 'dark' : 'light' }}>
      <style>{pageCSS}</style>

      <div className="w-full h-screen flex flex-col overflow-hidden"
        style={{ backgroundColor: bg, fontFamily: "'Inter','Geist Sans',sans-serif", transition: 'background 0.3s' }}>

        {/* ══════════ TOP BAR ══════════ */}
        <div className="flex-none z-50 flex items-center justify-between px-5 h-[54px] border-b"
          style={{ backgroundColor: panelBg, borderColor: border, backdropFilter: 'blur(16px)' }}>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md flex items-center justify-center shadow-sm"
                style={{ backgroundColor: isDark ? '#1e2535' : '#f3f4f6', border: `1px solid ${border}` }}>
                <span className="font-bold text-xs" style={{ color: text }}>V</span>
              </div>
              <span className="font-semibold text-sm" style={{ color: text }}>Velocis</span>
            </div>
            <div className="flex items-center gap-2 text-[13px]" style={{ color: muted }}>
              <button onClick={() => navigate('/dashboard')} className="hover:opacity-80 transition-opacity" style={{ color: muted }}>Dashboard</button>
              <span>/</span>
              <button onClick={() => navigate(`/repo/${id}`)} style={{ color: muted }}>{repoName}</button>
              <span>/</span>
              <span className="font-semibold" style={{ color: text }}>Visual Cortex</span>
            </div>
          </div>

          <div className="hidden md:flex items-center p-[3px] rounded-lg gap-[2px]"
            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', border: `1px solid ${border}` }}>
            {(['graph', 'service', 'flow'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className="px-3.5 py-1.5 rounded-md text-[13px] font-semibold capitalize transition-all"
                style={{
                  backgroundColor: view === v ? (isDark ? '#1e2535' : '#ffffff') : 'transparent',
                  color: view === v ? text : muted,
                  boxShadow: view === v ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
                }}>
                {v === 'graph' ? '3D View' : v === 'service' ? 'Service Map' : 'Dep. Flow'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold"
              style={{ backgroundColor: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 live-dot" />
              Sentinel Active
            </div>
            {[RefreshCw, Target, Maximize2].map((Icon, i) => (
              <button key={i} className="p-1.5 rounded-md transition-colors" style={{ color: muted }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = isDark ? '#1e2535' : '#f3f4f6')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                <Icon className="w-4 h-4" />
              </button>
            ))}
            <button onClick={() => setIsDark(!isDark)} className="p-1.5 rounded-md" style={{ color: muted }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = isDark ? '#1e2535' : '#f3f4f6')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className="w-7 h-7 rounded-full flex items-center justify-center ml-1 text-xs font-bold cursor-pointer"
              style={{
                backgroundColor: isDark ? '#1e2535' : '#ede9fe', color: isDark ? '#a78bfa' : '#7c3aed',
                border: `1px solid ${isDark ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.2)'}`
              }}>R</div>
          </div>
        </div>

        {/* ══════════ BODY ══════════ */}
        <div className="flex-1 flex overflow-hidden">

          {/* ── Left Sidebar ── */}
          <AnimatePresence>
            {leftPanelOpen && (
              <motion.div initial={{ x: -270 }} animate={{ x: 0 }} exit={{ x: -270 }} transition={{ duration: 0.22 }}
                className="w-[260px] flex-none border-r flex flex-col overflow-hidden z-30 iso-scroll"
                style={{ backgroundColor: panelBg, borderColor: border }}>
                <div className="flex-1 overflow-y-auto iso-scroll p-5 space-y-6">

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: muted }} />
                    <input type="text" placeholder="Search services…"
                      className="w-full pl-9 pr-3 py-2 rounded-lg text-[13px] focus:outline-none focus:ring-1 focus:ring-violet-500/40"
                      style={{ backgroundColor: isDark ? '#111827' : '#f9fafb', border: `1px solid ${border}`, color: text }} />
                  </div>

                  <div>
                    <h3 className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: muted }}>Agent Filters</h3>
                    <div className="space-y-2">
                      {[
                        { key: 'sentinel', label: 'Sentinel Signals', icon: Shield, ac: '#8b5cf6', ab: 'rgba(139,92,246,0.1)', abr: 'rgba(139,92,246,0.4)' },
                        { key: 'fortress', label: 'Fortress Failures', icon: TestTube2, ac: '#3b82f6', ab: 'rgba(59,130,246,0.1)', abr: 'rgba(59,130,246,0.4)' },
                        { key: 'cortex', label: 'Cortex Layers', icon: Eye, ac: '#10b981', ab: 'rgba(16,185,129,0.1)', abr: 'rgba(16,185,129,0.4)' },
                      ].map(f => {
                        const on = filters[f.key as keyof typeof filters];
                        return (
                          <button key={f.key} onClick={() => setFilters({ ...filters, [f.key]: !on })}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all"
                            style={{
                              backgroundColor: on ? f.ab : (isDark ? 'transparent' : '#f9fafb'),
                              border: `1px solid ${on ? f.abr : border}`, color: on ? f.ac : muted,
                            }}>
                            <f.icon className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{f.label}</span>
                            {on && <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: f.ac }} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: muted }}>Layer Controls</h3>
                    <div className="space-y-1.5">
                      {[
                        { key: 'microservices', label: 'Microservices' }, { key: 'apis', label: 'APIs' },
                        { key: 'databases', label: 'Databases' }, { key: 'external', label: 'External Services' },
                        { key: 'queues', label: 'Queues' },
                      ].map(l => {
                        const on = layers[l.key as keyof typeof layers];
                        return (
                          <label key={l.key} className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all"
                            style={{ backgroundColor: on ? (isDark ? 'rgba(255,255,255,0.03)' : '#f3f4f6') : 'transparent' }}>
                            <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                              style={{ backgroundColor: on ? '#8b5cf6' : 'transparent', border: `1.5px solid ${on ? '#8b5cf6' : (isDark ? '#374151' : '#d1d5db')}` }}>
                              {on && <CheckCircle className="w-3 h-3 text-white" />}
                            </div>
                            <input type="checkbox" checked={on} onChange={() => setLayers({ ...layers, [l.key]: !on })} className="sr-only" />
                            <span className="text-[13px] font-medium" style={{ color: on ? text : muted }}>{l.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-xl p-4 space-y-3"
                    style={{ backgroundColor: isDark ? '#0e1117' : '#f9fafb', border: `1px solid ${border}` }}>
                    <div className="text-[10px] font-bold tracking-widest uppercase" style={{ color: muted }}>System Status</div>
                    {[
                      { label: 'Healthy', count: services.filter(s => s.status === 'healthy').length, color: '#22c55e' },
                      { label: 'Degraded', count: services.filter(s => s.status === 'warning').length, color: '#f59e0b' },
                      { label: 'Critical', count: services.filter(s => s.status === 'critical').length, color: '#ef4444' },
                    ].map(({ label, count, color }) => (
                      <div key={label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                          <span className="text-[12px]" style={{ color: muted }}>{label}</span>
                        </div>
                        <span className="text-[13px] font-semibold" style={{ color: text }}>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ══════════ 3D CANVAS ══════════ */}
          <div className="flex-1 relative overflow-hidden">

            {/* Toggle Panel */}
            <button onClick={() => setLeftPanelOpen(!leftPanelOpen)}
              className="absolute top-3 left-3 p-2 rounded-lg backdrop-blur-sm z-50 transition-all hover:scale-105"
              style={{ backgroundColor: isDark ? 'rgba(14,17,23,0.85)' : 'rgba(255,255,255,0.9)', border: `1px solid ${border}` }}>
              <motion.div animate={{ rotate: leftPanelOpen ? 0 : 180 }} transition={{ duration: 0.3 }}>
                <ChevronLeft className="w-4 h-4" style={{ color: muted }} />
              </motion.div>
            </button>

            {/* Label */}
            <div className="absolute top-3 right-3 z-50 flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold"
              style={{
                backgroundColor: isDark ? 'rgba(14,17,23,0.87)' : 'rgba(255,255,255,0.9)',
                border: `1px solid ${border}`, color: muted, backdropFilter: 'blur(8px)'
              }}>
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 live-dot" />
              WebGL 3D Architecture View
            </div>

            {/* Floating FABs */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-50">
              {[
                { icon: AlertCircle, color: '#ef4444', label: 'Focus failing' },
                { icon: RotateCcw, color: muted, label: 'Reset view' },
                { icon: Grid3x3, color: muted, label: 'Auto-layout' },
                { icon: Camera, color: muted, label: 'Screenshot' },
              ].map(({ icon: Icon, color, label }, i) => (
                <motion.button key={i} whileHover={{ scale: 1.12 }} title={label}
                  initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.8 + i * 0.08 }}
                  className="w-10 h-10 rounded-full flex items-center justify-center shadow-xl"
                  style={{
                    backgroundColor: isDark ? 'rgba(14,17,23,0.92)' : 'rgba(255,255,255,0.92)',
                    border: `1px solid ${border}`, backdropFilter: 'blur(8px)'
                  }}>
                  <Icon style={{ width: 16, height: 16, color }} />
                </motion.button>
              ))}
            </div>

            {/* ── THE CANVAS ── */}
            <Canvas
              shadows
              camera={{ position: [12, 14, 16], fov: 42, near: 0.1, far: 200 }}
              gl={{ antialias: true, alpha: true }}
              style={{ width: '100%', height: '100%' }}
              onPointerMissed={() => setSelectedNode(null)}
            >
              <color attach="background" args={[isDark ? '#080a0f' : '#eef0f4']} />
              <fog attach="fog" args={[isDark ? '#080a0f' : '#eef0f4', 25, 50]} />
              <Suspense fallback={null}>
                <Scene
                  isDark={isDark}
                  selectedNode={selectedNode}
                  setSelectedNode={setSelectedNode}
                  filters={filters}
                />
              </Suspense>
            </Canvas>
          </div>

          {/* ══════════ RIGHT INSPECTOR ══════════ */}
          <AnimatePresence>
            {selectedNode && selectedService && (
              <motion.div initial={{ x: 340 }} animate={{ x: 0 }} exit={{ x: 340 }} transition={{ duration: 0.22 }}
                className="w-[310px] flex-none border-l flex flex-col overflow-hidden z-30"
                style={{ backgroundColor: panelBg, borderColor: border }}>
                <div className="flex-1 overflow-y-auto iso-scroll p-5 space-y-5">

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-lg font-bold tracking-tight" style={{ color: text }}>{selectedService.name}</h2>
                      <button onClick={() => setSelectedNode(null)} className="p-1 rounded transition-colors" style={{ color: muted }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = isDark ? '#1e2535' : '#f3f4f6')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                    {(() => {
                      const cfg = STATUS[selectedService.status];
                      return (
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                          backgroundColor: cfg.bg, color: cfg.text
                        }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: cfg.dot }} />
                          {cfg.label}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="rounded-xl p-4 grid grid-cols-2 gap-3"
                    style={{ backgroundColor: isDark ? '#0e1117' : '#f9fafb', border: `1px solid ${border}` }}>
                    {[
                      { label: 'p95 Latency', value: selectedService.p95 },
                      { label: 'Error Rate', value: selectedService.errRate },
                      { label: 'Tests', value: `${selectedService.tests}%` },
                      { label: 'Last Deploy', value: selectedService.deployment },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: muted, marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: text }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-3.5 h-3.5" style={{ color: '#8b5cf6' }} />
                      <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: muted }}>Sentinel Insights</h3>
                    </div>
                    {selectedService.status === 'critical' && (
                      <div style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 8,
                        backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 8
                      }}>
                        <AlertCircle style={{ width: 14, height: 14, color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
                        <p style={{ fontSize: 12, lineHeight: 1.6, color: isDark ? '#fca5a5' : '#b91c1c' }}>
                          Critical memory leak in request handler. p95 exceeds SLO. Blast radius propagating upstream.
                        </p>
                      </div>
                    )}
                    {selectedService.status === 'warning' && (
                      <div style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 8,
                        backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', marginBottom: 8
                      }}>
                        <AlertTriangle style={{ width: 14, height: 14, color: '#f59e0b', flexShrink: 0, marginTop: 1 }} />
                        <p style={{ fontSize: 12, lineHeight: 1.6, color: isDark ? '#fcd34d' : '#92400e' }}>
                          Degraded state induced by blast radius from analytics-service failure.
                        </p>
                      </div>
                    )}
                    <div style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 8,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#f9fafb', border: `1px solid ${border}`
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: muted, flexShrink: 0, marginTop: 5 }} />
                      <p style={{ fontSize: 12, lineHeight: 1.6, color: muted }}>Memory usage spike observed 08:00–10:00 UTC.</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <TestTube2 className="w-3.5 h-3.5" style={{ color: '#3b82f6' }} />
                      <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: muted }}>Fortress Status</h3>
                    </div>
                    <div style={{ borderRadius: 12, padding: 14, backgroundColor: isDark ? '#0e1117' : '#f9fafb', border: `1px solid ${border}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: muted }}>
                        <span>Tests passing</span>
                        <span style={{ fontWeight: 600, color: text }}>{selectedService.tests}%</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 999, overflow: 'hidden', backgroundColor: isDark ? '#1a1f2e' : '#e5e7eb' }}>
                        <div style={{
                          height: '100%', borderRadius: 999, width: `${selectedService.tests}%`,
                          backgroundColor: selectedService.tests === 100 ? '#22c55e' : selectedService.tests >= 90 ? '#f59e0b' : '#ef4444'
                        }} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: muted, marginBottom: 10 }}>Dependencies</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {selectedService.connections.map(cid => {
                        const c = services.find(s => s.id === cid);
                        if (!c) return null;
                        const ccfg = STATUS[c.status];
                        return (
                          <button key={cid} onClick={() => setSelectedNode(cid)}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                              backgroundColor: isDark ? '#0e1117' : '#f9fafb', border: `1px solid ${border}`
                            }}
                            onMouseEnter={e => (e.currentTarget.style.borderColor = ccfg.dot + '80')}
                            onMouseLeave={e => (e.currentTarget.style.borderColor = border)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: ccfg.dot }} />
                              <span style={{ fontSize: 13, fontWeight: 500, color: text }}>{c.name}</span>
                            </div>
                            <ChevronRight style={{ width: 14, height: 14, color: muted }} />
                          </button>
                        );
                      })}
                      {selectedService.connections.length === 0 && (
                        <p style={{ fontSize: 12, color: muted }}>No downstream dependencies</p>
                      )}
                    </div>
                  </div>

                  <button style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '10px 16px', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer',
                    backgroundColor: isDark ? '#f1f5f9' : '#111827', color: isDark ? '#111827' : '#f1f5f9', transition: 'opacity 0.2s'
                  }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                    Open in Workspace <ChevronRight style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ══════════ BOTTOM TIMELINE ══════════ */}
        <div className="flex-none border-t transition-colors"
          style={{ backgroundColor: panelBg, borderColor: border, backdropFilter: 'blur(16px)', height: '72px' }}>
          <div style={{ height: '100%', padding: '0 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: muted }}>
                System Activity Timeline
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 10, color: muted }}>Last 24 hours</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className="live-dot" style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#ef4444' }} />
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#ef4444' }}>LIVE</span>
                </div>
              </div>
            </div>

            <div style={{ position: 'relative', height: 20 }}>
              <div style={{
                position: 'absolute', inset: '50% 0', height: 2, transform: 'translateY(-50%)', borderRadius: 999,
                backgroundColor: isDark ? '#1a1f2e' : '#e5e7eb'
              }} />
              {timelineEvents.map((ev, i) => (
                <div key={i} style={{ position: 'absolute', top: '50%', left: `${ev.position}%`, transform: 'translate(-50%,-50%)', zIndex: 2, cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredEvent(i)} onMouseLeave={() => setHoveredEvent(null)}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%', backgroundColor: ev.color, boxShadow: `0 0 10px ${ev.color}99`,
                    border: `2px solid ${isDark ? '#080a0f' : '#eef0f4'}`, transition: 'transform 0.15s',
                    transform: hoveredEvent === i ? 'scale(1.6)' : 'scale(1)'
                  }} />
                  {hoveredEvent === i && (
                    <div style={{
                      position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
                      padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 20,
                      backgroundColor: isDark ? '#1a1f2e' : '#111827', color: ev.color, border: `1px solid ${ev.color}44`,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
                    }}>
                      {ev.label}
                      <div style={{
                        position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                        borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
                        borderTop: `5px solid ${isDark ? '#1a1f2e' : '#111827'}`
                      }} />
                    </div>
                  )}
                </div>
              ))}
              <div className="live-dot" style={{
                position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ef4444',
                boxShadow: '0 0 10px rgba(239,68,68,0.8)'
              }} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
