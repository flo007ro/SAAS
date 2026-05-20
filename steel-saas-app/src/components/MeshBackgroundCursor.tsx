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

    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const onLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);

    const COLS = 26;
    const ROWS = 18;
    const INFLUENCE = 140;
    const REPEL = 28;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      ctx.clearRect(0, 0, W, H);

      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, "#050a12");
      bg.addColorStop(0.5, "#080f1a");
      bg.addColorStop(1, "#060c16");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      const cellW = W / COLS;
      const cellH = H / ROWS;

      const pts: { x: number; y: number; pulse: number }[] = [];

      for (let col = 0; col <= COLS; col++) {
        for (let row = 0; row <= ROWS; row++) {
          const bx = col * cellW;
          const by = row * cellH;

          const wave_dx = Math.sin(t * 0.8 + row * 0.4 + col * 0.2) * 8;
          const wave_dy = Math.cos(t * 0.6 + col * 0.3 + row * 0.15) * 6;

          let cx = bx + wave_dx;
          let cy = by + wave_dy;

          const dx = cx - mx;
          const dy = cy - my;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < INFLUENCE && dist > 0) {
            const force = (1 - dist / INFLUENCE);
            const angle = Math.atan2(dy, dx);
            cx += Math.cos(angle) * force * REPEL;
            cy += Math.sin(angle) * force * REPEL;
          }

          const pulse = (Math.sin(t * 1.2 + col * 0.5 + row * 0.7) + 1) / 2;
          const cursorGlow = dist < INFLUENCE ? (1 - dist / INFLUENCE) : 0;

          pts.push({ x: cx, y: cy, pulse: pulse + cursorGlow * 1.5 });
        }
      }

      const idx = (col: number, row: number) => col * (ROWS + 1) + row;

      for (let col = 0; col <= COLS; col++) {
        for (let row = 0; row <= ROWS; row++) {
          const p = pts[idx(col, row)];

          if (col < COLS) {
            const p2 = pts[idx(col + 1, row)];
            const lineAlpha = 0.04 + p.pulse * 0.07;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(56,189,248,${lineAlpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }

          if (row < ROWS) {
            const p2 = pts[idx(col, row + 1)];
            const lineAlpha = 0.04 + p.pulse * 0.07;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(56,189,248,${lineAlpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }

          const nodeAlpha = 0.15 + p.pulse * 0.55;
          const nodeR = 0.8 + p.pulse * 1.4;
          ctx.beginPath();
          ctx.arc(p.x, p.y, nodeR, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(125,211,252,${nodeAlpha})`;
          ctx.fill();
        }
      }

      // Cursor glow
      if (mx > 0) {
        const g = ctx.createRadialGradient(mx, my, 0, mx, my, 180);
        g.addColorStop(0, "rgba(56,189,248,0.08)");
        g.addColorStop(1, "rgba(56,189,248,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(mx, my, 180, 0, Math.PI * 2);
        ctx.fill();
      }

      // Ambient blobs
      const blobs = [
        { x: W * 0.15, y: H * 0.25, r: 280, color: "56,189,248" },
        { x: W * 0.85, y: H * 0.75, r: 240, color: "14,165,233" },
        { x: W * 0.5, y: H * 0.05, r: 200, color: "99,102,241" },
      ];
      blobs.forEach(({ x, y, r, color }) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${color},0.05)`);
        g.addColorStop(1, `rgba(${color},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
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
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}