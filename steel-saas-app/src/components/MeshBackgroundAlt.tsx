"use client";
import { useEffect, useRef } from "react";

export default function MeshBackgroundAlt() {
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

    // Hexagonal grid style
    const HEX_SIZE = 48;

    const hexPoints = (cx: number, cy: number, size: number) => {
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        pts.push({ x: cx + size * Math.cos(angle), y: cy + size * Math.sin(angle) });
      }
      return pts;
    };

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#060c18";
      ctx.fillRect(0, 0, W, H);

      const hexW = HEX_SIZE * Math.sqrt(3);
      const hexH = HEX_SIZE * 2;
      const cols = Math.ceil(W / hexW) + 2;
      const rows = Math.ceil(H / (hexH * 0.75)) + 2;

      for (let row = -1; row < rows; row++) {
        for (let col = -1; col < cols; col++) {
          const offset = row % 2 === 0 ? 0 : hexW / 2;
          const cx = col * hexW + offset;
          const cy = row * hexH * 0.75;

          const dx = cx - mx;
          const dy = cy - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const cursorInfluence = dist < 200 ? (1 - dist / 200) : 0;

          const pulse = (Math.sin(t * 0.9 + col * 0.3 + row * 0.4) + 1) / 2;
          const breathe = 0.5 + pulse * 0.5 + cursorInfluence * 1.2;

          const pts = hexPoints(cx, cy, HEX_SIZE - 2);

          // Hex outline
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < 6; i++) ctx.lineTo(pts[i].x, pts[i].y);
          ctx.closePath();
          const hexAlpha = 0.04 + breathe * 0.06 + cursorInfluence * 0.08;
          ctx.strokeStyle = `rgba(56,189,248,${hexAlpha})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();

          // Center dot
          ctx.beginPath();
          ctx.arc(cx, cy, 1.2 + breathe * 1.2, 0, Math.PI * 2);
          const dotAlpha = 0.12 + breathe * 0.4 + cursorInfluence * 0.5;
          ctx.fillStyle = `rgba(125,211,252,${dotAlpha})`;
          ctx.fill();

          // Cursor hex fill
          if (cursorInfluence > 0.3) {
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < 6; i++) ctx.lineTo(pts[i].x, pts[i].y);
            ctx.closePath();
            ctx.fillStyle = `rgba(56,189,248,${cursorInfluence * 0.06})`;
            ctx.fill();
          }
        }
      }

      // Diagonal scan line
      const scanX = ((t * 120) % (W + H)) - H;
      const grad = ctx.createLinearGradient(scanX, 0, scanX + 80, 80);
      grad.addColorStop(0, "rgba(56,189,248,0)");
      grad.addColorStop(0.5, "rgba(56,189,248,0.04)");
      grad.addColorStop(1, "rgba(56,189,248,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Cursor glow
      if (mx > 0) {
        const cg = ctx.createRadialGradient(mx, my, 0, mx, my, 180);
        cg.addColorStop(0, "rgba(56,189,248,0.1)");
        cg.addColorStop(1, "rgba(56,189,248,0)");
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(mx, my, 180, 0, Math.PI * 2);
        ctx.fill();
      }

      // Corner accent blobs
      [{ x: 0, y: 0 }, { x: W, y: H }].forEach(({ x, y }) => {
        const bg = ctx.createRadialGradient(x, y, 0, x, y, 300);
        bg.addColorStop(0, "rgba(14,165,233,0.07)");
        bg.addColorStop(1, "rgba(14,165,233,0)");
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(x, y, 300, 0, Math.PI * 2);
        ctx.fill();
      });

      t += 0.006;
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
