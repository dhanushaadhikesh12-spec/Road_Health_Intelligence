import React from 'react';
import { Shield, RefreshCw, Database, Activity, LogOut } from 'lucide-react';
import { DashboardStats, User } from '../types';

interface HeaderProps {
  stats: DashboardStats | null;
  loading: boolean;
  onRefresh: () => void;
  onSeed: () => void;
  isSeeding: boolean;
  user: User;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  loading,
  onRefresh,
  onSeed,
  isSeeding,
  user,
  onLogout,
}) => {
  const healthScore = stats?.road_health_score ?? 88;
  const healthColor =
    healthScore >= 80 ? '#10b981' : healthScore >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <header className="glass-panel" style={{ padding: '16px 28px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)',
            }}
          >
            <Shield size={26} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#f8fafc' }}>
                ROADGUARD <span style={{ color: '#a78bfa' }}>AI</span>
              </h1>
              <span
                style={{
                  background: 'rgba(139, 92, 246, 0.15)',
                  color: '#c4b5fd',
                  border: '1px solid rgba(139, 92, 246, 0.35)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                AUTHORITY COMMAND CENTER
              </span>
            </div>
            <p style={{ fontSize: '0.825rem', color: '#94a3b8', marginTop: '2px' }}>
              Logged in: <strong>{user.name}</strong> ({user.email}) • Municipal Authority
            </p>
          </div>
        </div>

        {/* Live Status and Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Health Index Metric */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 16px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
            }}
          >
            <Activity size={18} color={healthColor} />
            <div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                City Road Health
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: healthColor, fontFamily: 'var(--font-mono)' }}>
                {healthScore}<span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>/100</span>
              </div>
            </div>
          </div>

          {/* Seed demo data button */}
          <button
            onClick={onSeed}
            disabled={isSeeding}
            className="btn btn-secondary"
            title="Populate test defect clusters and observations"
            style={{ fontSize: '0.8rem' }}
          >
            <Database size={15} color="#38bdf8" />
            <span>{isSeeding ? 'Seeding...' : 'Seed Data'}</span>
          </button>

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="btn btn-primary"
            style={{ fontSize: '0.8rem' }}
          >
            <RefreshCw
              size={15}
              style={{
                animation: loading ? 'spin 1s linear infinite' : 'none',
              }}
            />
            <span>Refresh</span>
          </button>

          {/* Logout button */}
          <button
            onClick={onLogout}
            className="btn btn-secondary"
            style={{ color: '#f87171', fontSize: '0.8rem' }}
            title="Log out of authority session"
          >
            <LogOut size={15} />
            <span>Logout</span>
          </button>
        </div>
      </div>
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </header>
  );
};
