import React, { useState } from 'react';
import {
  X,
  MapPin,
  Clock,
  CheckCircle2,
  Calendar,
  Wrench,
  RotateCcw,
  Sparkles,
  Layers,
  Camera,
  ExternalLink,
} from 'lucide-react';
import { DefectDetail, DefectStatus } from '../types';
import { reviewDetectionApi, verifyRepairApi } from '../services/api';

interface DefectDrawerProps {
  defect: DefectDetail | null;
  onClose: () => void;
  onUpdateStatus: (id: string, newStatus: DefectStatus) => Promise<void>;
}

export const DefectDrawer: React.FC<DefectDrawerProps> = ({
  defect,
  onClose,
  onUpdateStatus,
}) => {
  const [updating, setUpdating] = useState(false);

  if (!defect) return null;

  const handleStatusChange = async (status: DefectStatus) => {
    setUpdating(true);
    try {
      await onUpdateStatus(defect.id, status);
    } finally {
      setUpdating(false);
    }
  };

  const priorityColor =
    defect.priority_score >= 75
      ? '#ef4444'
      : defect.priority_score >= 50
      ? '#f97316'
      : defect.priority_score >= 25
      ? '#eab308'
      : '#3b82f6';

  const breakdown = defect.priority_breakdown;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '540px',
        maxWidth: '100vw',
        background: '#0e1422',
        borderLeft: '1px solid var(--border-strong)',
        boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.7)',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Drawer Header */}
      <div
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.8)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1.15rem',
                fontWeight: 700,
                color: '#38bdf8',
              }}
            >
              {defect.id}
            </span>
            <span
              className="badge"
              style={{
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.3)',
              }}
            >
              {defect.defect_type}
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
            Centroid: {defect.latitude.toFixed(5)}, {defect.longitude.toFixed(5)}
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Content scroll area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        {/* Status Lifecycle Actions */}
        <div
          className="glass-panel"
          style={{
            padding: '16px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '12px',
            }}
          >
            Authority Lifecycle Actions • Status: <span style={{ color: '#38bdf8' }}>{defect.status}</span>
            {defect.verification_status && (
              <span style={{ marginLeft: '8px', color: '#34d399', fontSize: '0.7rem' }}>
                ({defect.verification_status})
              </span>
            )}
          </div>

          {/* Section 109.3 Review AI Detections */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>
              AI Detection Review
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              <button
                disabled={updating}
                onClick={async () => {
                  setUpdating(true);
                  try {
                    await reviewDetectionApi(defect.id, 'CONFIRM');
                    await onUpdateStatus(defect.id, 'VERIFIED');
                  } finally {
                    setUpdating(false);
                  }
                }}
                className="btn btn-secondary"
                style={{ fontSize: '0.72rem', padding: '6px 10px', color: '#34d399' }}
              >
                <CheckCircle2 size={13} />
                <span>Confirm Detection</span>
              </button>

              <button
                disabled={updating}
                onClick={async () => {
                  setUpdating(true);
                  try {
                    await reviewDetectionApi(defect.id, 'REJECT');
                    await onUpdateStatus(defect.id, 'REPAIRED');
                  } finally {
                    setUpdating(false);
                  }
                }}
                className="btn btn-secondary"
                style={{ fontSize: '0.72rem', padding: '6px 10px', color: '#f87171' }}
              >
                <span>Reject (False Positive)</span>
              </button>

              <button
                disabled={updating}
                onClick={async () => {
                  setUpdating(true);
                  try {
                    await reviewDetectionApi(defect.id, 'NEEDS_REVIEW');
                  } finally {
                    setUpdating(false);
                  }
                }}
                className="btn btn-secondary"
                style={{ fontSize: '0.72rem', padding: '6px 10px', color: '#fbbf24' }}
              >
                <span>Mark Needs Review</span>
              </button>
            </div>
          </div>

          {/* Lifecycle Transitions */}
          <div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>
              Repair Dispatch Lifecycle
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {defect.status !== 'SCHEDULED' && defect.status !== 'REPAIRED' && (
                <button
                  disabled={updating}
                  onClick={() => handleStatusChange('SCHEDULED')}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.78rem', padding: '8px 12px' }}
                >
                  <Calendar size={14} color="#fbbf24" />
                  <span>Assign Repair Crew</span>
                </button>
              )}

              {defect.status !== 'REPAIRED' && (
                <button
                  disabled={updating}
                  onClick={async () => {
                    setUpdating(true);
                    try {
                      await verifyRepairApi(defect.id);
                      await onUpdateStatus(defect.id, 'REPAIRED');
                    } finally {
                      setUpdating(false);
                    }
                  }}
                  className="btn btn-success"
                  style={{ fontSize: '0.78rem', padding: '8px 12px' }}
                >
                  <Wrench size={14} />
                  <span>Verify Repair Completed</span>
                </button>
              )}

              {defect.status === 'REPAIRED' && (
                <button
                  disabled={updating}
                  onClick={() => handleStatusChange('RECURRED')}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.78rem', padding: '8px 12px', color: '#f87171' }}
                >
                  <RotateCcw size={14} />
                  <span>Reopen / Flag Recurred</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Priority Engine Score Card */}
        <div
          className="glass-panel"
          style={{
            padding: '20px',
            borderTop: `3px solid ${priorityColor}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Triage Priority Score
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Deterministic multi-factor formula
              </div>
            </div>
            <div
              style={{
                fontSize: '2.4rem',
                fontWeight: 800,
                color: priorityColor,
                fontFamily: 'var(--font-mono)',
                lineHeight: 1,
              }}
            >
              {defect.priority_score}
              <span style={{ fontSize: '1rem', color: '#64748b' }}>/100</span>
            </div>
          </div>

          {/* Breakdown bars */}
          {breakdown && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                  <span style={{ color: '#cbd5e1' }}>Defect Severity (35%)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>{breakdown.severity.points.toFixed(1)} pts</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${(breakdown.severity.points / 35) * 100}%`, height: '100%', background: '#f87171' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                  <span style={{ color: '#cbd5e1' }}>Multi-Citizen Corroboration (25%)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>{breakdown.observation_support.points.toFixed(1)} pts</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${(breakdown.observation_support.points / 25) * 100}%`, height: '100%', background: '#34d399' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                  <span style={{ color: '#cbd5e1' }}>AI Model Confidence (15%)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>{breakdown.confidence.points.toFixed(1)} pts</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${(breakdown.confidence.points / 15) * 100}%`, height: '100%', background: '#38bdf8' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                  <span style={{ color: '#cbd5e1' }}>Recency Decay (15%)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>{breakdown.recency.points.toFixed(1)} pts</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${(breakdown.recency.points / 15) * 100}%`, height: '100%', background: '#fbbf24' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Observations Evidence Timeline */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
            }}
          >
            <div
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Layers size={16} color="#38bdf8" />
              <span>Evidence Corroboration History ({defect.observations.length})</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {defect.observations.map((obs, idx) => (
              <div
                key={obs.id}
                className="glass-panel"
                style={{
                  padding: '16px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>
                    {obs.id}
                  </span>
                  <span
                    className="badge"
                    style={{
                      background:
                        obs.duplicate_decision === 'MERGE'
                          ? 'rgba(16, 185, 129, 0.15)'
                          : 'rgba(56, 189, 248, 0.15)',
                      color: obs.duplicate_decision === 'MERGE' ? '#34d399' : '#38bdf8',
                      border: `1px solid ${
                        obs.duplicate_decision === 'MERGE' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(56, 189, 248, 0.3)'
                      }`,
                    }}
                  >
                    {obs.duplicate_decision}
                  </span>
                </div>

                {/* Observation Meta */}
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>
                    <strong>Severity:</strong> {obs.severity} • <strong>Confidence:</strong>{' '}
                    {obs.confidence ? `${Math.round(obs.confidence * 100)}%` : 'Manual'}
                  </div>
                  {obs.duplicate_distance_meters !== null && (
                    <div style={{ color: '#38bdf8' }}>
                      <strong>Deduplication:</strong> {obs.duplicate_distance_meters.toFixed(1)}m from cluster center (score: {(obs.duplicate_score ?? 0).toFixed(2)})
                    </div>
                  )}
                  {obs.description && (
                    <div style={{ fontStyle: 'italic', color: '#cbd5e1', marginTop: '4px' }}>
                      "{obs.description}"
                    </div>
                  )}
                  <div style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '4px' }}>
                    Captured: {new Date(obs.timestamp).toLocaleString()}
                  </div>
                </div>

                {/* Observation Image if present */}
                {obs.image_url && (
                  <div style={{ marginTop: '10px' }}>
                    <img
                      src={obs.image_url}
                      alt="Observation Evidence"
                      style={{
                        width: '100%',
                        maxHeight: '160px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
