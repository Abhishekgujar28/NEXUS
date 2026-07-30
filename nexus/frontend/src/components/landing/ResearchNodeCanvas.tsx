import React, { useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/lib/motion';

/**
 * Evolved research node network — uses the product's citrine/moss/amber palette.
 * Canvas-based for performance, but styled to feel like the SVG ResearchViz.
 * Warm glow, subtle drift, cursor awareness without aggressive attraction.
 */

interface Node {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  label?: string;
}

const PALETTE = [
  '#B4D024', // citrine-400
  '#98B216', // citrine-500
  '#C9E24A', // citrine-300
  '#8DB37C', // moss-400
  '#F5C563', // amber-400
  '#E4A93F', // amber-500
];

const LABELS = [
  'Consensus', 'Vector Index', 'Graph Signal', 'Raft Protocol',
  'Gap Analysis', 'Citation Edge', 'RFC 7540', 'Dependency',
  'Architecture', 'Synthesis', 'Evidence',
];

export function ResearchNodeCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const reduced = useReducedMotion();

  const nodes = useMemo(() => {
    const count = 14;
    const arr: Node[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 120 + (i % 3) * 40 + Math.random() * 30;
      const cx = 300 + Math.cos(angle) * radius;
      const cy = 200 + Math.sin(angle) * radius;
      arr.push({
        x: cx,
        y: cy,
        baseX: cx,
        baseY: cy,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        radius: 3 + (i % 4) * 1.2,
        color: PALETTE[i % PALETTE.length],
        label: i % 3 === 0 ? LABELS[Math.floor(i / 3) % LABELS.length] : undefined,
      });
    }
    return arr;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = 600;
    let height = 400;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const handleMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    canvas.addEventListener('mousemove', handleMouse);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Scale nodes to canvas size
      const sx = width / 600;
      const sy = height / 400;

      // Update node positions — gentle drift toward base position
      if (!reduced) {
        for (const node of nodes) {
          node.x += node.vx;
          node.y += node.vy;

          // Drift back to base position (gentle spring)
          const dx = node.baseX - node.x;
          const dy = node.baseY - node.y;
          node.vx += dx * 0.001;
          node.vy += dy * 0.001;

          // Damping
          node.vx *= 0.995;
          node.vy *= 0.995;

          // Subtle mouse awareness — gentle repulsion
          const mx = mouseRef.current.x / sx;
          const my = mouseRef.current.y / sy;
          if (mx > 0 && my > 0) {
            const mdx = node.x - mx;
            const mdy = node.y - my;
            const dist = Math.sqrt(mdx * mdx + mdy * mdy);
            if (dist < 80 && dist > 5) {
              const force = (80 - dist) / 80 * 0.08;
              node.vx += (mdx / dist) * force;
              node.vy += (mdy / dist) * force;
            }
          }
        }
      }

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = (b.x - a.x) * sx;
          const dy = (b.y - a.y) * sy;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 140) {
            const opacity = (1 - dist / 140) * 0.06;
            ctx.beginPath();
            ctx.moveTo(a.x * sx, a.y * sy);
            ctx.lineTo(b.x * sx, b.y * sy);
            ctx.strokeStyle = `rgba(180, 208, 36, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      for (const node of nodes) {
        const x = node.x * sx;
        const y = node.y * sy;
        const r = node.radius * Math.min(sx, sy);

        // Outer glow ring
        ctx.beginPath();
        ctx.arc(x, y, r + 4, 0, Math.PI * 2);
        ctx.fillStyle = node.color.replace(')', ', 0.06)').replace('rgb', 'rgba');
        ctx.fill();

        // Node dot
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.globalAlpha = 0.85;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Label
        if (node.label && width > 400) {
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.fillStyle = 'hsl(44, 10%, 42%)';
          ctx.fillText(node.label, x + r + 6, y + 3);
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      canvas.removeEventListener('mousemove', handleMouse);
    };
  }, [nodes, reduced]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: '100%', height: '100%' }}
      aria-hidden="true"
    />
  );
}
