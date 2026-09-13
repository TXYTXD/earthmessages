import { useEffect, useRef } from "react";
import type { BackgroundKind } from "@/lib/themeEffects";

interface Props {
  kind: BackgroundKind;
  intensity: number; // 0..100
  colors: string[]; // theme colours to paint with
  paused?: boolean;
}

interface Particle {
  x: number; y: number; r: number; vx: number; vy: number; a: number; c: string; t: number;
}

const TAU = Math.PI * 2;

// A soft animated layer painted behind the whole app in the theme's own
// colours. Everything is drawn on one canvas so it stays cheap, and it
// stops completely when the tab is hidden or the effect is "none".
export function ThemeBackground({ kind, intensity, colors, paused }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frame = useRef<number>();

  useEffect(() => {
    if (kind === "none" || paused) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const strength = Math.min(100, Math.max(0, intensity)) / 100;
    const palette = colors.length ? colors : ["#6366f1", "#3b82f6", "#06b6d4"];
    let w = 0;
    let h = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const pick = () => palette[Math.floor(Math.random() * palette.length)];

    // How many things move, scaled by the screen so phones stay smooth
    const density = (base: number) => Math.round(base * strength * Math.min(1.4, Math.max(0.5, (w * h) / 900000)));

    let particles: Particle[] = [];
    const spawn = (n: number, make: () => Particle) => {
      particles = Array.from({ length: Math.max(0, n) }, make);
    };

    switch (kind) {
      case "stars":
        spawn(density(140), () => ({
          x: rand(0, w), y: rand(0, h), r: rand(0.4, 1.6), vx: rand(-0.04, 0.04), vy: rand(-0.04, 0.04),
          a: rand(0.2, 0.9), c: pick(), t: rand(0, TAU),
        }));
        break;
      case "bubbles":
        spawn(density(38), () => ({
          x: rand(0, w), y: rand(0, h + 200), r: rand(6, 34), vx: rand(-0.15, 0.15), vy: rand(-0.5, -0.12),
          a: rand(0.05, 0.16), c: pick(), t: rand(0, TAU),
        }));
        break;
      case "orbs":
        spawn(Math.max(3, density(7)), () => ({
          x: rand(0, w), y: rand(0, h), r: rand(140, 340), vx: rand(-0.9, 0.9), vy: rand(-0.7, 0.7),
          a: rand(0.1, 0.22), c: pick(), t: rand(0, TAU),
        }));
        break;
      case "snow":
        spawn(density(120), () => ({
          x: rand(0, w), y: rand(-h, h), r: rand(1, 3.2), vx: rand(-0.2, 0.2), vy: rand(0.25, 0.9),
          a: rand(0.25, 0.75), c: "#ffffff", t: rand(0, TAU),
        }));
        break;
      case "embers":
        spawn(density(70), () => ({
          x: rand(0, w), y: rand(0, h + 100), r: rand(1, 3), vx: rand(-0.25, 0.25), vy: rand(-0.9, -0.25),
          a: rand(0.25, 0.8), c: pick(), t: rand(0, TAU),
        }));
        break;
      case "rain":
        spawn(density(150), () => ({
          x: rand(0, w), y: rand(-h, h), r: rand(5, 14), vx: 0.6, vy: rand(7, 13),
          a: rand(0.08, 0.26), c: pick(), t: 0,
        }));
        break;
      default:
        break;
    }

    let t = 0;
    const speed = reduced ? 0.25 : 1;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      t += 0.006 * speed;

      switch (kind) {
        case "aurora": {
          // Wide soft ribbons that breathe across the top
          for (let i = 0; i < 3; i++) {
            const c = palette[i % palette.length];
            const cy = h * (0.18 + i * 0.16) + Math.sin(t * (0.7 + i * 0.25)) * h * 0.08;
            const g = ctx.createRadialGradient(
              w * (0.3 + 0.2 * Math.sin(t * 0.5 + i)), cy, 0,
              w * (0.3 + 0.2 * Math.sin(t * 0.5 + i)), cy, Math.max(w, h) * 0.55
            );
            g.addColorStop(0, hexA(c, 0.13 * strength));
            g.addColorStop(1, hexA(c, 0));
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
          }
          break;
        }
        case "waves": {
          for (let i = 0; i < 3; i++) {
            const c = palette[i % palette.length];
            ctx.beginPath();
            ctx.moveTo(0, h);
            const amp = h * 0.045 * (1 + i * 0.4);
            const base = h * (0.62 + i * 0.11);
            for (let x = 0; x <= w; x += 12) {
              const y = base + Math.sin(x / (140 + i * 60) + t * (1.4 + i * 0.5)) * amp;
              ctx.lineTo(x, y);
            }
            ctx.lineTo(w, h);
            ctx.closePath();
            ctx.fillStyle = hexA(c, 0.1 * strength);
            ctx.fill();
          }
          break;
        }
        case "grid": {
          const step = 48;
          const drift = (t * 22) % step;
          ctx.lineWidth = 1;
          ctx.strokeStyle = hexA(palette[0], 0.13 * strength);
          ctx.beginPath();
          for (let x = -step + drift; x <= w + step; x += step) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
          }
          for (let y = -step + drift; y <= h + step; y += step) {
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
          }
          ctx.stroke();
          // a glow that sweeps across the lines
          const gx = ((t * 0.12) % 1.4 - 0.2) * w;
          const g = ctx.createRadialGradient(gx, h * 0.5, 0, gx, h * 0.5, w * 0.35);
          g.addColorStop(0, hexA(palette[1] ?? palette[0], 0.12 * strength));
          g.addColorStop(1, hexA(palette[1] ?? palette[0], 0));
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, w, h);
          break;
        }
        case "rain": {
          ctx.lineWidth = 1.1;
          for (const p of particles) {
            ctx.strokeStyle = hexA(p.c, p.a * strength);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + p.vx * 2, p.y + p.r);
            ctx.stroke();
            p.x += p.vx * speed;
            p.y += p.vy * speed;
            if (p.y > h) {
              p.y = -20;
              p.x = Math.random() * w;
            }
          }
          break;
        }
        case "orbs": {
          for (const p of particles) {
            // each orb breathes a little, so the drift is easy to see
            p.t += 0.012 * speed;
            const r = p.r * (1 + Math.sin(p.t) * 0.14);
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
            g.addColorStop(0, hexA(p.c, p.a * (0.75 + 0.25 * Math.sin(p.t * 1.3)) * strength));
            g.addColorStop(1, hexA(p.c, 0));
            ctx.fillStyle = g;
            ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
            p.x += p.vx * speed;
            p.y += p.vy * speed;
            if (p.x < -p.r) p.x = w + p.r;
            if (p.x > w + p.r) p.x = -p.r;
            if (p.y < -p.r) p.y = h + p.r;
            if (p.y > h + p.r) p.y = -p.r;
          }
          break;
        }
        default: {
          // stars, bubbles, snow, embers — round particles
          for (const p of particles) {
            p.t += 0.02 * speed;
            const twinkle = kind === "stars" ? 0.55 + 0.45 * Math.sin(p.t * 2) : 1;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, TAU);
            ctx.fillStyle = hexA(p.c, p.a * twinkle * strength);
            ctx.fill();
            if (kind === "bubbles") {
              ctx.lineWidth = 1;
              ctx.strokeStyle = hexA(p.c, p.a * 1.6 * strength);
              ctx.stroke();
            }
            p.x += (p.vx + (kind === "snow" ? Math.sin(p.t) * 0.25 : 0)) * speed;
            p.y += p.vy * speed;
            if (p.y < -40) { p.y = h + 20; p.x = Math.random() * w; }
            if (p.y > h + 40) { p.y = -20; p.x = Math.random() * w; }
            if (p.x < -40) p.x = w + 20;
            if (p.x > w + 40) p.x = -20;
          }
        }
      }
      frame.current = requestAnimationFrame(draw);
    };

    frame.current = requestAnimationFrame(draw);

    const onVisibility = () => {
      if (document.hidden) {
        if (frame.current) cancelAnimationFrame(frame.current);
      } else {
        frame.current = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [kind, intensity, colors.join(","), paused]);

  if (kind === "none" || paused) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ opacity: 1 }}
    />
  );
}

// #rrggbb + alpha → rgba()
function hexA(hex: string, alpha: number): string {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${Math.min(1, Math.max(0, alpha))})`;
}
