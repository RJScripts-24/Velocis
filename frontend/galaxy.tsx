interface Star {
    x: number;
    y: number;
    z: number;
    radius: number;
    opacity: number;
    twinkleSpeed: number;
    twinkleOffset: number;
    color: string;
}

interface Nebula {
    x: number;
    y: number;
    radius: number;
    color: string;
    opacity: number;
}

function GalaxyBackground({ isDark }: { isDark: boolean }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animFrameRef = useRef<number>(0);
    const starsRef = useRef<Star[]>([]);
    const nebulaeRef = useRef<Nebula[]>([]);
    const timeRef = useRef<number>(0);

    const STAR_COLORS = [
        '#FFFFFF', '#EEF0FF', '#D4DBFF', '#C8D8FF',
        '#B3C8FF', '#A8D0FF', '#9ECEFF', '#FFE8D0',
    ];

    const NEBULA_COLORS_DARK = [
        'rgba(109,40,217,X)',
        'rgba(29,78,216,X)',
        'rgba(5,150,105,X)',
        'rgba(180,83,9,X)',
        'rgba(88,28,135,X)',
    ];

    const NEBULA_COLORS_LIGHT = [
        'rgba(109,40,217,X)',
        'rgba(29,78,216,X)',
        'rgba(5,150,105,X)',
    ];

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const initCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        const generateStars = () => {
            const count = Math.floor((window.innerWidth * window.innerHeight) / 3000);
            starsRef.current = Array.from({ length: count }, () => ({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                z: Math.random(),
                radius: Math.random() * 1.4 + 0.2,
                opacity: Math.random() * 0.7 + 0.3,
                twinkleSpeed: Math.random() * 0.02 + 0.005,
                twinkleOffset: Math.random() * Math.PI * 2,
                color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
            }));
        };

        const generateNebulae = () => {
            const colors = isDark ? NEBULA_COLORS_DARK : NEBULA_COLORS_LIGHT;
            nebulaeRef.current = Array.from({ length: isDark ? 6 : 3 }, (_, i) => ({
                x: (Math.random() * 0.8 + 0.1) * canvas.width,
                y: (Math.random() * 0.8 + 0.1) * canvas.height,
                radius: Math.random() * 280 + 120,
                color: colors[i % colors.length],
                opacity: isDark
                    ? Math.random() * 0.055 + 0.02
                    : Math.random() * 0.025 + 0.008,
            }));
        };

        const drawNebula = (nebula: Nebula) => {
            const grad = ctx.createRadialGradient(
                nebula.x, nebula.y, 0,
                nebula.x, nebula.y, nebula.radius
            );
            const c = nebula.color.replace('X', String(nebula.opacity));
            const cFade = nebula.color.replace('X', '0');
            grad.addColorStop(0, c);
            grad.addColorStop(0.5, nebula.color.replace('X', String(nebula.opacity * 0.4)));
            grad.addColorStop(1, cFade);
            ctx.beginPath();
            ctx.arc(nebula.x, nebula.y, nebula.radius, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
        };

        const drawStar = (star: Star, time: number) => {
            const twinkle = Math.sin(time * star.twinkleSpeed * 60 + star.twinkleOffset);
            const currentOpacity = star.opacity + twinkle * 0.25;
            const clampedOpacity = Math.max(0.05, Math.min(1, currentOpacity));
            const dynamicRadius = star.radius * (0.85 + twinkle * 0.15);

            if (star.radius > 0.9) {
                const glow = ctx.createRadialGradient(
                    star.x, star.y, 0,
                    star.x, star.y, dynamicRadius * 3
                );
                glow.addColorStop(0, star.color.replace(')', \`, \${clampedOpacity * 0.4})\`).replace('rgb', 'rgba'));
        glow.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.arc(star.x, star.y, dynamicRadius * 3, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(star.x, star.y, dynamicRadius, 0, Math.PI * 2);
      ctx.globalAlpha = clampedOpacity;
      ctx.fillStyle = star.color;
      ctx.fill();
      ctx.globalAlpha = 1;
    };

    const render = (time: number) => {
      timeRef.current = time;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = isDark ? '#010308' : 'rgba(245,245,244,0)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      nebulaeRef.current.forEach(drawNebula);

      if (isDark) {
        starsRef.current.forEach(s => drawStar(s, time * 0.001));
      } else {
        starsRef.current.slice(0, 40).forEach(s => {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.radius * 0.6, 0, Math.PI * 2);
          ctx.globalAlpha = 0.06;
          ctx.fillStyle = '#6D28D9';
          ctx.fill();
          ctx.globalAlpha = 1;
        });
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    initCanvas();
    generateStars();
    generateNebulae();
    animFrameRef.current = requestAnimationFrame(render);

    const handleResize = () => {
      initCanvas();
      generateStars();
      generateNebulae();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [isDark]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        display: 'block',
      }}
    />
  );
}
