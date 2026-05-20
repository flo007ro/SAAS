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
    const INFLUENCE = 160;
    const REPEL = 36;

    const colorCycle = [
      [56, 189, 248],
      [139, 92, 246],
      [20, 184, 166],
      [34, 211, 238],
      [56, 189, 248],
    ];

    const lerpColor = (f: number) => {
      const n = colorCycle.length - 1;
      const i = Math.floor(f * n) % n;
      const frac = (f * n) % 1;
      const a = colorCycle[i];
      const b = colorCycle[(i + 1) % colorCycle.length];
      return [
        Math.round(a[0] + (b[0] - a[0]) * frac),
        Math.round(a[1] + (b[1] - a[1]) * frac),
        Math.round(a[2] + (b[2] - a[2]) * frac),
      ];
    };

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      ctx.clearRect(0, 0, W, H);

      const colorT = (Math.sin(t * 0.1) + 1) / 2;
      const [r, g, b] = lerpColor(colorT);

      ctx.fillStyle = "#070e1a";
      ctx.fillRect(0, 0, W, H);

      const cellW = W / COLS;
      const cellH = H / ROWS;

      const pts: { x: number; y: number; pulse: number; glow: number }[] = [];

      for (let col = 0; col <= COLS; col++) {
        for (let row = 0; row <= ROWS; row++) {
          const bx = col * cellW;
          const by = row * cellH;

          const wdx = Math.sin(t * 0.8 + row * 0.4 + col * 0.2) * 10;
          const wdy = Math.cos(t * 0.6 + col * 0.3 + row * 0.15) * 8;

          let cx = bx + wdx;
          let cy = by + wdy;

          const dx = cx - mx;
          const dy = cy - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          let glow = 0;

          if (dist < INFLUENCE && dist > 0) {
            const force = 1 - dist / INFLUENCE;
            const angle = Math.atan2(dy, dx);
            cx += Math.cos(angle) * force * REPEL;
            cy += Math.sin(angle) * force * REPEL;
            glow = force;
          }

          const pulse = (Math.sin(t * 1.2 + col * 0.5 + row * 0.7) + 1) / 2;
          pts.push({ x: cx, y: cy, pulse, glow });
        }
      }

      const idx = (col: number, row: number) => col * (ROWS + 1) + row;

      for (let col = 0; col <= COLS; col++) {
        for (let row = 0; row <= ROWS; row++) {
          const p = pts[idx(col, row)];
          const alpha = 0.09 + p.pulse * 0.12 + p.glow * 0.18;

          if (col < COLS) {
            const p2 = pts[idx(col + 1, row)];
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }

          if (row < ROWS) {
            const p2 = pts[idx(col, row + 1)];
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }

          const nr = Math.min(255, r + 50);
          const ng = Math.min(255, g + 30);
          const nb = Math.min(255, b + 20);
          const nodeAlpha = 0.25 + p.pulse * 0.65 + p.glow * 0.6;
          const nodeR = 1.0 + p.pulse * 1.6 + p.glow * 2.0;
          ctx.beginPath();
          ctx.arc(p.x, p.y, nodeR, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${nr},${ng},${nb},${nodeAlpha})`;
          ctx.fill();
        }
      }

      if (mx > 0) {
        const cg = ctx.createRadialGradient(mx, my, 0, mx, my, 220);
        cg.addColorStop(0, `rgba(${r},${g},${b},0.15)`);
        cg.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(mx, my, 220, 0, Math.PI * 2);
        ctx.fill();
      }

      const blobs = [
        { x: W * 0.15, y: H * 0.25, rad: 340 },
        { x: W * 0.85, y: H * 0.75, rad: 300 },
        { x: W * 0.5, y: H * 0.05, rad: 250 },
      ];
      blobs.forEach(({ x, y, rad }) => {
        const bg = ctx.createRadialGradient(x, y, 0, x, y, rad);
        bg.addColorStop(0, `rgba(${r},${g},${b},0.12)`);
        bg.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, Math.PI * 2);
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
