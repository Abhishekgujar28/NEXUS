import React from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/lib/motion';

/**
 * Lightweight animated research visualization used in the landing hero.
 * - renders an evolving network of nodes connected by lines
 * - respects prefers-reduced-motion
 * - intentionally simple to avoid adding heavy dependencies
 */
const NODE_COLORS = ['#B4D024', '#98B216', '#F5C563', '#8DB37C'];

function Node({ x, y, r, id, color }: any) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={color} opacity={0.95} />
      <circle cx={x} cy={y} r={r + 6} fill="none" stroke={color} strokeOpacity={0.08} />
    </g>
  );
}

export function ResearchViz({ className }: { className?: string }) {
  const reduced = useReducedMotion();
  const nodes = React.useMemo(() => {
    const arr = new Array(8).fill(0).map((_, i) => ({
      id: `n${i}`,
      x: 160 + Math.cos((i / 8) * Math.PI * 2) * (110 + (i % 3) * 6),
      y: 96 + Math.sin((i / 8) * Math.PI * 2) * (80 + (i % 4) * 4),
      r: 6 + (i % 3),
      color: NODE_COLORS[i % NODE_COLORS.length],
    }));
    return arr;
  }, []);

  if (reduced) {
    return (
      <svg width="420" height="220" viewBox="0 0 420 220" className={className}>
        <rect width="100%" height="100%" rx={12} fill="rgba(255,255,255,0.02)" />
        <g transform="translate(18,14)">
          {nodes.map((n) => (
            <Node key={n.id} {...n} />
          ))}
        </g>
      </svg>
    );
  }

  return (
    <motion.svg width="420" height="220" viewBox="0 0 420 220" className={className}>
      <defs>
        <filter id="softGlow">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feBlend in="SourceGraphic" in2="b" mode="screen" />
        </filter>
      </defs>
      <rect width="100%" height="100%" rx={12} fill="rgba(255,255,255,0.02)" />
      <g transform="translate(18,14)">
        {/* connecting lines */}
        <motion.g
          initial={{ opacity: 0.5 }}
          animate={{ opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          strokeWidth={1}
          strokeOpacity={0.06}
          stroke="white"
        >
          {nodes.map((a: any, i: number) =>
            nodes.slice(i + 1).map((b: any) => (
              <motion.line
                key={`${a.id}-${b.id}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={a.color}
                style={{ mixBlendMode: 'screen' }}
                animate={{ strokeOpacity: [0.02, 0.08, 0.02] }}
                transition={{ duration: 8 + (i % 3) * 1.2, repeat: Infinity }}
              />
            ))
          )}
        </motion.g>

        {/* nodes */}
        {nodes.map((n: any, i: number) => (
          <motion.g
            key={n.id}
            initial={{ y: n.y - 4, opacity: 0 }}
            animate={{ y: [n.y - 4, n.y + 4, n.y - 4], opacity: [0.9, 1, 0.9] }}
            transition={{ duration: 4 + (i % 4) * 0.6, repeat: Infinity, ease: 'easeInOut' }}
            style={{ filter: 'url(#softGlow)' }}
          >
            <Node {...n} />
          </motion.g>
        ))}

        {/* center label */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.9] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <text x={200} y={36} textAnchor="middle" fontSize={12} fill="rgba(255,255,255,0.9)" fontFamily="JetBrains Mono, monospace">
            Idea → Research → Evidence
          </text>
        </motion.g>
      </g>
    </motion.svg>
  );
}

export default ResearchViz;
