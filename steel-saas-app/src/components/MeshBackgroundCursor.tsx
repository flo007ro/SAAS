"use client";
import { useEffect, useRef } from "react";

export default function MeshBackgroundCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const onMove = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
    const onLeave = () => { mouseRef.current = { x: -1000, y: -1000 }; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);

    const COLS = 26;
    const ROWS = 18;
    const INFLUENCE = 150;
    const REPEL = 32;

    // Color cycle: blue → purple → teal → cyan → blue
    const colorCycle = [
      [56, 189, 248],   // sky blue
      [139, 92, 246],   // violet
      [20, 184, 166],   // teal
      [34, 211, 238],   // cyan
      [56, 189, 248],   // back to blue
    ];

    const lerpColor = (t: number) => {
      const n = colorCycle.length - 1;
      const i = Math.floor(t * n) % n;
      const f = (t * n) % 1;
      const a = colorCycle[i];
      const b = colorCycle[(i + 1) % colorCycle.length];
      return [
        Math.round(a[0] + (b[0] - a[0]) * f),
        Math.round(a[1] + (b[1] - a[1]) * f),
        Math.round(a[2] + (b[2] - a[2]) * f),
      ];
    };

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      ctx.clearRect(0, 0, W, H);

      // Brighter background — 25% more luminous
      const colorT = (Math.sin(t * 0.12) + 1) / 2;
      const [r, g, b] = lerpColor(colorT);

      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, "#070e1a");
      bg.addColorStop(0.5, "#0a1525");
      bg.addColorStop(1, "#080f1e");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      const cellW = W / COLS;
      const cellH = H / ROWS;

      const pts: { x: number; y: number; pulse: number; cursorGlow: number }[] = [];

      for (let col = 0; col <= COLS; col++) {
        for (let row = 0; row <= ROWS; row++) {
          const bx = col * cellW;
          const by = row * cellH;

          const wave_dx = Math.sin(t * 0.8 + row * 0.4 + col * 0.2) * 9;
          const wave_dy = Math.cos(t * 0.6 + col * 0.3 + row * 0.15) * 7;

          let cx = bx + wave_dx;
          let cy = by + wave_dy;

          const dx = cx - mx;
          const dy = cy - my;
          const dist = Math.sqrt(dx * dx + dy * dy);

          let cursorGlow = 0;
          if (dist < INFLUENCE && dist > 0) {
            const force = (1 - dist / INFLUENCE);
            const angle = Math.atan2(dy, dx);
            cx += Math.cos(angle) * force * REPEL;
            cy += Math.sin(angle) * force * REPEL;
            cursorGlow = force;
          }

          const pulse = (Math.sin(t * 1.2 + col * 0.5 + row * 0.7) + 1) / 2;
          pts.push({ x: cx, y: cy, pulse, cursorGlow });
        }
      }

      const idx = (col: number, row: number) => col * (ROWS + 1) + row;

      for (let col = 0; col <= COLS; col++) {
        for (let row = 0; row <= ROWS; row++) {
          const p = pts[idx(col, row)];
          const baseAlpha = 0.07 + p.pulse * 0.1 + p.cursorGlow * 0.15;

          if (col < COLS) {
            const p2 = pts[idx(col + 1, row)];
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${r},${g},${b},${baseAlpha})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }

          if (row < ROWS) {
            const p2 = pts[idx(col, row + 1)];
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${r},${g},${b},${baseAlpha})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }

          const nodeAlpha = 0.2 + p.pulse * 0.6 + p.cursorGlow * 0.5;
          const nodeR = 0.9 + p.pulse * 1.5 + p.cursorGlow * 1.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, nodeR, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r + 40},${g + 20},${b + 10},${nodeAlpha})`;
          ctx.fill();
        }
      }

      // Cursor glow — matches current color
      if (mx > 0) {
        const g2 = ctx.createRadialGradient(mx, my, 0, mx, my, 200);
        g2.addColorStop(0, `rgba(${r},${g},${b},0.12)`);
        g2.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = g2;
        ctx.beginPath();
        ctx.arc(mx, my, 200, 0, Math.PI * 2);
        ctx.fill();
      }

      // Ambient blobs — color-matched
      const blobs = [
        { x: W * 0.15, y: H * 0.25, r: 320 },
        { x: W * 0.85, y: H * 0.75, r: 280 },
        { x: W * 0.5, y: H * 0.05, r: 220 },
      ];
      blobs.forEach(({ x, y, r: br }) => {
        const gr = ctx.createRadialGradient(x, y, 0, x, y, br);
        gr.addColorStop(0, `rgba(${r},${g},${b},0.1)`);
        gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(x, y, br, 0, Math.PI * 2);
        ctx.fill();
      });

      t += 0.008;
      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <canvas ref={canvasRef} style={{
      position: "fixed", inset: 0, width: "100%", height: "100%",
      zIndex: 0, pointerEvents: "none",
    }} />
  );
}