import React, { useState, useEffect } from 'react';
import {
  Camera,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  Upload,
  RefreshCw,
  LogOut,
  Layers,
  Sparkles,
  Info,
  Navigation,
  Eye,
} from 'lucide-react';
import {
  fetchMyReports,
  fetchDefects,
  submitObservationApi,
  clearStoredSession,
  fetchDefectDetail,
} from '../services/api';
import { DefectSummary, ObservationOut, User, DefectDetail } from '../types';
import { DefectMap } from './DefectMap';

interface CitizenHomeProps {
  user: User;
  onLogout: () => void;
}

export const CitizenHome: React.FC<CitizenHomeProps> = ({ user, onLogout }) => {
  const [myReports, setMyReports] = useState<ObservationOut[]>([]);
  const [nearbyDefects, setNearbyDefects] = useState<DefectSummary[]>([]);
  const [loading, setLoading] = useState(false);

  // Report Modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [latitude, setLatitude] = useState('12.9352');
  const [longitude, setLongitude] = useState('77.6245');
  const [accuracy, setAccuracy] = useState('4.5');
  const [description, setDescription] = useState('');
  const [motionScore, setMotionScore] = useState('0.42');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Read-only defect view for citizen
  const [viewDefect, setViewDefect] = useState<DefectDetail | null>(null);

  const loadCitizenData = async () => {
    setLoading(true);
    try {
      const [reports, defectsRes] = await Promise.all([
        fetchMyReports().catch(() => []),
        fetchDefects({ limit: 50 }).catch(() => ({ defects: [], total: 0, limit: 50, offset: 0 })),
      ]);
      setMyReports(reports);
      setNearbyDefects(defectsRes.defects);
    } catch (err) {
      console.error('Error loading citizen data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCitizenData();
  }, []);

  const handleAcquireGPS = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude.toFixed(5));
          setLongitude(pos.coords.longitude.toFixed(5));
          setAccuracy((pos.coords.accuracy || 5.0).toFixed(1));
        },
        (err) => {
          console.warn('Geolocation denied/unavailable, keeping default:', err.message);
        }
      );
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSubmissionResult(null);

    const formData = new FormData();
    if (selectedFile) {
      formData.append('image', selectedFile);
    }
    formData.append('latitude', latitude);
    formData.append('longitude', longitude);
    formData.append('accuracy_meters', accuracy);
    formData.append('location_source', 'DEVICE');
    formData.append('motion_score', motionScore);
    if (description) {
      formData.append('description', description);
    }

    try {
      const result = await submitObservationApi(formData);
      setSubmissionResult(result);
      setDescription('');
      setSelectedFile(null);
      // Reload my reports
      loadCitizenData();
    } catch (err: any) {
      setError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const inspectDefectReadOnly = async (defectId: string) => {
    try {
      const detail = await fetchDefectDetail(defectId);
      setViewDefect(detail);
    } catch (err) {
      console.error('Failed to load defect:', err);
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 32px' }}>
      {/* Citizen Header */}
      <header className="glass-panel" style={{ padding: '16px 28px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(56, 189, 248, 0.35)',
              }}
            >
              <Camera size={24} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc' }}>
                  ROADGUARD AI <span style={{ color: '#38bdf8' }}>CITIZEN HOME</span>
                </h1>
                <span
                  style={{
                    background: 'rgba(56, 189, 248, 0.12)',
                    color: '#38bdf8',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  CITIZEN ROLE
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                Welcome, <strong>{user.name}</strong> ({user.email}) • Report hazards to municipal crews
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setShowReportModal(true)}
              className="btn btn-primary"
              style={{ padding: '10px 20px', fontSize: '0.875rem' }}
            >
              <Camera size={16} />
              <span>REPORT ROAD DEFECT</span>
            </button>

            <button onClick={loadCitizenData} disabled={loading} className="btn btn-secondary">
              <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => {
                clearStoredSession();
                onLogout();
              }}
              className="btn btn-secondary"
              style={{ color: '#f87171' }}
            >
              <LogOut size={15} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Action Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '28px',
          marginBottom: '24px',
          background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.15) 0%, rgba(15, 23, 42, 0.7) 100%)',
          borderLeft: '4px solid #38bdf8',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
            Help Keep City Roads Safe
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8', maxWidth: '650px', lineHeight: 1.5 }}>
            Capture a photo of any pothole, crack, or surface rutting. Our Edge AI analyzes severity, correlates with nearby citizen reports to prevent duplication, and dispatches repair priority to city road maintenance.
          </p>
        </div>

        <button
          onClick={() => setShowReportModal(true)}
          className="btn btn-primary"
          style={{ padding: '12px 24px', fontSize: '0.95rem' }}
        >
          <Camera size={18} />
          <span>REPORT ROAD DEFECT NOW</span>
        </button>
      </div>

      {/* Grid: My Reports + Local Road Health Map */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) 1.2fr', gap: '24px', marginBottom: '24px' }}>
        {/* Left Column: My Reports Feed */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="#38bdf8" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                My Submitted Reports ({myReports.length})
              </h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Authenticated Citizen View
            </span>
          </div>

          <div style={{ overflowY: 'auto', maxHeight: '520px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {myReports.length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center', color: '#64748b' }}>
                <Camera size={32} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
                You haven't submitted any reports yet.
                <div style={{ marginTop: '10px' }}>
                  <button onClick={() => setShowReportModal(true)} className="btn btn-secondary" style={{ fontSize: '0.75rem' }}>
                    Submit Your First Road Report
                  </button>
                </div>
              </div>
            ) : (
              myReports.map((obs) => (
                <div
                  key={obs.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    padding: '14px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#38bdf8', fontWeight: 700 }}>
                        {obs.id}
                      </span>
                      <span className="badge badge-status" style={{ fontSize: '0.65rem' }}>
                        {obs.defect_type}
                      </span>
                    </div>

                    <button
                      onClick={() => inspectDefectReadOnly(obs.defect_id)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                      title="View Digital Defect Details"
                    >
                      <Eye size={12} />
                      <span>{obs.defect_id}</span>
                    </button>
                  </div>

                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.4 }}>
                    <div>
                      <strong>Severity:</strong> <span style={{ color: '#cbd5e1' }}>{obs.severity}</span> • <strong>Deduplication:</strong>{' '}
                      <span style={{ color: obs.duplicate_decision === 'MERGE' ? '#34d399' : '#38bdf8' }}>
                        {obs.duplicate_decision}
                      </span>
                    </div>
                    {obs.description && (
                      <div style={{ fontStyle: 'italic', color: '#cbd5e1', marginTop: '4px' }}>
                        "{obs.description}"
                      </div>
                    )}
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '6px' }}>
                      Reported: {new Date(obs.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Nearby Road Health Map */}
        <div>
          <DefectMap
            defects={nearbyDefects}
            selectedDefectId={viewDefect?.id || null}
            onSelectDefect={inspectDefectReadOnly}
          />
        </div>
      </div>

      {/* REPORT ROAD DEFECT MODAL */}
      {showReportModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: '20px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '560px',
              padding: '28px',
              background: '#0e1422',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
                  Report Road Hazard
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Citizen Report • Automated AI Analysis & Deduplication
                </p>
              </div>
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setSubmissionResult(null);
                  setError(null);
                }}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Success Feedback Card */}
            {submissionResult && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '10px',
                  padding: '16px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontWeight: 700, marginBottom: '6px' }}>
                  <CheckCircle size={18} />
                  <span>Report Submitted & Classified by AI</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                  <div><strong>Digital Defect ID:</strong> <span style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>{submissionResult.defect_id}</span></div>
                  <div><strong>Assigned Priority Score:</strong> {submissionResult.priority_score}/100 ({submissionResult.priority_tier})</div>
                  <div><strong>Deduplication Status:</strong> {submissionResult.duplicate_decision} (Corroborating Evidence: {submissionResult.evidence_count})</div>
                  <div><strong>Current Status:</strong> {submissionResult.status}</div>
                </div>
              </div>
            )}

            {error && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  marginBottom: '16px',
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmitReport} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Image Input */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                  Road Image (Photo of Pothole/Crack)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: '#cbd5e1',
                    fontSize: '0.8rem',
                  }}
                />
              </div>

              {/* Coordinates & GPS Capture */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Latitude
                  </label>
                  <input
                    type="text"
                    required
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '0.85rem',
                      fontFamily: 'var(--font-mono)',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Longitude
                  </label>
                  <input
                    type="text"
                    required
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '0.85rem',
                      fontFamily: 'var(--font-mono)',
                    }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAcquireGPS}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', alignSelf: 'flex-start' }}
              >
                <Navigation size={14} color="#38bdf8" />
                <span>Acquire Live Device GPS</span>
              </button>

              {/* Motion Data */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>
                  <span>Vehicle Motion / Bump Score</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{motionScore}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={motionScore}
                  onChange={(e) => setMotionScore(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Description / Location notes
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Deep pothole right before traffic signal, scraped car bumper."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                    outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                >
                  <Upload size={16} />
                  <span>{submitting ? 'Analyzing & Submitting...' : 'Submit Report'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* READ-ONLY DEFECT DETAIL MODAL FOR CITIZENS (No admin action buttons!) */}
      {viewDefect && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: '20px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '540px',
              padding: '28px',
              background: '#0e1422',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.15rem', color: '#38bdf8', fontWeight: 800 }}>
                    {viewDefect.id}
                  </span>
                  <span className="badge badge-status">{viewDefect.status}</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
                  Centroid: {viewDefect.latitude.toFixed(5)}, {viewDefect.longitude.toFixed(5)}
                </div>
              </div>
              <button
                onClick={() => setViewDefect(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Status and Priority Summary */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '16px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Defect Type:</span>
                  <span style={{ fontWeight: 600, color: '#f8fafc' }}>{viewDefect.defect_type}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Priority Level:</span>
                  <span style={{ fontWeight: 700, color: '#38bdf8' }}>{viewDefect.priority_score}/100</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Corroborating Reports:</span>
                  <span style={{ color: '#cbd5e1' }}>{viewDefect.observation_count} citizen submissions</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Repair Status:</span>
                  <span style={{ fontWeight: 600, color: viewDefect.status === 'REPAIRED' ? '#34d399' : '#fbbf24' }}>
                    {viewDefect.status}
                  </span>
                </div>
              </div>

              {/* Citizen Notice regarding admin controls */}
              <div
                style={{
                  background: 'rgba(56, 189, 248, 0.06)',
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Info size={16} color="#38bdf8" />
                <span>
                  Citizens have read-only visibility into triage progress. Defect status and repair assignments are managed by Municipal Authority engineers.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
