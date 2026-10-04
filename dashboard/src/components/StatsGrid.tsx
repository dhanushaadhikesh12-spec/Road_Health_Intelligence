import React from 'react';
import { Camera, AlertTriangle, Layers, Flame, Wrench, CheckCircle } from 'lucide-react';
import { DashboardStats } from '../types';

interface StatsGridProps {
  stats: DashboardStats | null;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ stats }) => {
  const cards = [
    {
      title: 'Total Observations',
      value: stats?.total_observations ?? 0,
      subtext: 'Citizen & patrol uploads',
      icon: <Camera size={22} color="#38bdf8" />,
      borderAccent: 'rgba(56, 189, 248, 0.4)',
      bgGlow: 'rgba(56, 189, 248, 0.08)',
    },
    {
      title: 'Canonical Defects',
      value: stats?.unique_defects ?? 0,
      subtext: 'Deduplicated physical hazards',
      icon: <Layers size={22} color="#818cf8" />,
      borderAccent: 'rgba(129, 140, 248, 0.4)',
      bgGlow: 'rgba(129, 140, 248, 0.08)',
    },
    {
      title: 'Deduplicated & Merged',
      value: stats?.duplicate_observations ?? 0,
      subtext: `${
        stats?.total_observations
          ? Math.round(((stats.duplicate_observations) / Math.max(1, stats.total_observations)) * 100)
          : 0
      }% corroboration rate`,
      icon: <Layers size={22} color="#34d399" />,
      borderAccent: 'rgba(52, 211, 153, 0.4)',
      bgGlow: 'rgba(52, 211, 153, 0.08)',
    },
    {
      title: 'Critical Hazards',
      value: stats?.critical_defects ?? 0,
      subtext: 'Priority score ≥ 75',
      icon: <Flame size={22} color="#f87171" />,
      borderAccent: 'rgba(248, 113, 113, 0.4)',
      bgGlow: 'rgba(248, 113, 113, 0.1)',
    },
    {
      title: 'Active Work Orders',
      value: stats?.under_repair ?? 0,
      subtext: 'Verified or in repair',
      icon: <Wrench size={22} color="#fbbf24" />,
      borderAccent: 'rgba(251, 191, 36, 0.4)',
      bgGlow: 'rgba(251, 191, 36, 0.08)',
    },
    {
      title: 'Repaired & Resolved',
      value: stats?.resolved ?? 0,
      subtext: 'Work completed',
      icon: <CheckCircle size={22} color="#10b981" />,
      borderAccent: 'rgba(16, 185, 129, 0.4)',
      bgGlow: 'rgba(16, 185, 129, 0.08)',
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}
    >
      {cards.map((card, idx) => (
        <div
          key={idx}
          className="glass-panel"
          style={{
            padding: '20px',
            position: 'relative',
            overflow: 'hidden',
            borderTop: `2px solid ${card.borderAccent}`,
            background: `radial-gradient(circle at top right, ${card.bgGlow}, var(--bg-card) 60%)`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}
          >
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {card.title}
            </span>
            <div
              style={{
                padding: '8px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.04)',
              }}
            >
              {card.icon}
            </div>
          </div>
          <div
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: '#ffffff',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            {card.value}
          </div>
          <div
            style={{
              fontSize: '0.75rem',
              color: '#64748b',
              marginTop: '6px',
            }}
          >
            {card.subtext}
          </div>
        </div>
      ))}
    </div>
  );
};
