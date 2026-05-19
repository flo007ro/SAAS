"use client";
import { useEffect, useRef } from "react";

export default function MeshBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    const COLS = 24;
    const ROWS = 16;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Deep dark background
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, "#050a12");
      bg.addColorStop(0.5, "#080f1a");
      bg.addColorStop(1, "#060c16");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      const cellW = W / COLS;
      const cellH = H / ROWS;

      // Draw animated mesh grid
      for (let col = 0; col <= COLS; col++) {
        for (let row = 0; row <= ROWS; row++) {
          const bx = col * cellW;
          const by = row * cellH;

          // Wave displacement
          const dx = Math.sin(t * 0.8 + row * 0.4 + col * 0.2) * 8;
          const dy = Math.cos(t * 0.6 + col * 0.3 + row * 0.15) * 6;
          const x = bx + dx;
          const y = by + dy;

          // Node pulse intensity
          const pulse = (Math.sin(t * 1.2 + col * 0.5 + row * 0.7) + 1) / 2;

          // Draw horizontal lines
          if (col < COLS) {
            const nx = (col + 1) * cellW + Math.sin(t * 0.8 + row * 0.4 + (col + 1) * 0.2) * 8;
            const ny = by + Math.cos(t * 0.6 + (col + 1) * 0.3 + row * 0.15) * 6;
            const lineAlpha = 0.04 + pulse * 0.06;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(nx, ny);
            ctx.strokeStyle = `rgba(56, 189, 248, ${lineAlpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }

          // Draw vertical lines
          if (row < ROWS) {
            const nx = bx + Math.sin(t * 0.8 + (row + 1) * 0.4 + col * 0.2) * 8;
            const ny = (row + 1) * cellH + Math.cos(t * 0.6 + col * 0.3 + (row + 1) * 0.15) * 6;
            const lineAlpha = 0.04 + pulse * 0.06;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(nx, ny);
            ctx.strokeStyle = `rgba(56, 189, 248, ${lineAlpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }

          // Draw nodes at intersections
          const nodeAlpha = 0.15 + pulse * 0.5;
          const nodeR = 0.8 + pulse * 1.2;
          ctx.beginPath();
          ctx.arc(x, y, nodeR, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(125, 211, 252, ${nodeAlpha})`;
          ctx.fill();
        }
      }

      // Accent glow blobs
      const blobs = [
        { x: W * 0.2, y: H * 0.3, r: 300, color: "56,189,248" },
        { x: W * 0.8, y: H * 0.7, r: 250, color: "14,165,233" },
        { x: W * 0.5, y: H * 0.1, r: 200, color: "99,102,241" },
      ];

      blobs.forEach(({ x, y, r, color }) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${color},0.06)`);
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
