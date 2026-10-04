import React, { useState } from 'react';
import { Shield, User, Lock, ArrowRight, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
import { loginApi, registerApi } from '../services/api';
import { UserRole, User as UserType } from '../types';

interface RoleSelectScreenProps {
  onLoginSuccess: (user: UserType) => void;
}

export const RoleSelectScreen: React.FC<RoleSelectScreenProps> = ({ onLoginSuccess }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('CITIZEN');
  const [isRegister, setIsRegister] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister && selectedRole === 'CITIZEN') {
        const res = await registerApi(name, email, password);
        onLoginSuccess(res.user);
      } else {
        const res = await loginApi(email, password);
        onLoginSuccess(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (role: UserRole) => {
    setError(null);
    setLoading(true);
    const demoEmail = role === 'CITIZEN' ? 'citizen@roadguard.demo' : 'admin@roadguard.demo';
    const demoPass = role === 'CITIZEN' ? 'citizen123' : 'admin123';
    setEmail(demoEmail);
    setPassword(demoPass);
    setSelectedRole(role);
    setIsRegister(false);

    try {
      const res = await loginApi(demoEmail, demoPass);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        zIndex: 1,
      }}
    >
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 0 35px rgba(56, 189, 248, 0.4)',
          }}
        >
          <Shield size={34} color="#ffffff" />
        </div>
        <h1
          style={{
            fontSize: '2.2rem',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: '#ffffff',
          }}
        >
          ROADGUARD <span style={{ color: '#38bdf8' }}>AI</span>
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginTop: '6px' }}>
          Autonomous Road Health Intelligence & Municipal Dispatch
        </p>
      </div>

      {/* Role Selection Container */}
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: '32px',
          position: 'relative',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#38bdf8',
              marginBottom: '6px',
            }}
          >
            Role-Based Authentication
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
            Choose access type:
          </h2>
        </div>

        {/* 2-Role Tab Buttons */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            background: 'var(--bg-secondary)',
            padding: '6px',
            borderRadius: '12px',
            marginBottom: '24px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setSelectedRole('CITIZEN');
              setError(null);
            }}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background:
                selectedRole === 'CITIZEN'
                  ? 'linear-gradient(135deg, #0284c7, #0ea5e9)'
                  : 'transparent',
              color: selectedRole === 'CITIZEN' ? '#ffffff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}
          >
            <User size={16} />
            <span>CITIZEN</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedRole('ADMIN');
              setIsRegister(false);
              setError(null);
            }}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background:
                selectedRole === 'ADMIN'
                  ? 'linear-gradient(135deg, #7c3aed, #8b5cf6)'
                  : 'transparent',
              color: selectedRole === 'ADMIN' ? '#ffffff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}
          >
            <Shield size={16} />
            <span>ADMIN / AUTHORITY</span>
          </button>
        </div>

        {/* Form Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f1f5f9' }}>
            {selectedRole === 'CITIZEN'
              ? isRegister
                ? 'Create Citizen Account'
                : 'Citizen Sign In'
              : 'Municipal Authority Portal'}
          </div>

          {selectedRole === 'CITIZEN' && (
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#38bdf8',
                fontSize: '0.78rem',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {isRegister ? 'Already registered? Log in' : 'Need an account? Register'}
            </button>
          )}
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {isRegister && selectedRole === 'CITIZEN' && (
            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Priya Sharma"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              />
            </div>
          )}

          <div>
            <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={selectedRole === 'CITIZEN' ? 'citizen@roadguard.demo' : 'admin@roadguard.demo'}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: '100%',
              marginTop: '8px',
              padding: '12px',
              fontSize: '0.9rem',
              background:
                selectedRole === 'ADMIN'
                  ? 'linear-gradient(135deg, #7c3aed, #8b5cf6)'
                  : 'linear-gradient(135deg, #0284c7, #0ea5e9)',
            }}
          >
            <span>{loading ? 'Authenticating...' : isRegister ? 'Register & Continue' : `Enter as ${selectedRole}`}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Section 109.10: Development Demo Quick-Fill Accounts */}
        <div
          style={{
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              fontSize: '0.72rem',
              color: '#64748b',
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '10px',
            }}
          >
            Hackathon 1-Click Demo Accounts (Dev Only)
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleQuickDemo('CITIZEN')}
              style={{
                padding: '8px 10px',
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                color: '#38bdf8',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div>👤 Demo Citizen</div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>
                citizen@roadguard.demo
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('ADMIN')}
              style={{
                padding: '8px 10px',
                background: 'rgba(139, 92, 246, 0.08)',
                border: '1px solid rgba(139, 92, 246, 0.25)',
                color: '#a78bfa',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div>🛡️ Demo Authority</div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>
                admin@roadguard.demo
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
