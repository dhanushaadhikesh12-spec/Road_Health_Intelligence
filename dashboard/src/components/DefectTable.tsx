import React from 'react';
import { Search, Filter, ArrowUpDown, ChevronRight, AlertCircle } from 'lucide-react';
import { DefectSummary, DefectStatus, DefectType } from '../types';

interface DefectTableProps {
  defects: DefectSummary[];
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  typeFilter: string;
  onTypeFilterChange: (type: string) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  sortOrder: string;
  onSortOrderChange: (sort: string) => void;
  onSelectDefect: (id: string) => void;
  selectedDefectId: string | null;
}

export const DefectTable: React.FC<DefectTableProps> = ({
  defects,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  searchQuery,
  onSearchQueryChange,
  sortOrder,
  onSortOrderChange,
  onSelectDefect,
  selectedDefectId,
}) => {
  const statuses = [
    { label: 'All Statuses', value: '' },
    { label: 'Candidate', value: 'CANDIDATE' },
    { label: 'Corroborated', value: 'CORROBORATED' },
    { label: 'Verified', value: 'VERIFIED' },
    { label: 'Scheduled', value: 'SCHEDULED' },
    { label: 'Repaired', value: 'REPAIRED' },
  ];

  const types = [
    { label: 'All Defect Types', value: '' },
    { label: 'Pothole', value: 'POTHOLE' },
    { label: 'Crack', value: 'CRACK' },
    { label: 'Rutting', value: 'RUTTING' },
    { label: 'Surface Wear', value: 'SURFACE_WEAR' },
  ];

  // Client-side search filtering
  const filtered = defects.filter((d) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.id.toLowerCase().includes(q) ||
      d.defect_type.toLowerCase().includes(q) ||
      d.status.toLowerCase().includes(q) ||
      d.latitude.toString().includes(q) ||
      d.longitude.toString().includes(q)
    );
  });

  const getPriorityBadgeClass = (score: number) => {
    if (score >= 75) return 'badge-critical';
    if (score >= 50) return 'badge-high';
    if (score >= 25) return 'badge-medium';
    return 'badge-low';
  };

  const getStatusBadge = (status: DefectStatus) => {
    if (status === 'REPAIRED') return <span className="badge badge-repaired">Repaired</span>;
    if (status === 'VERIFIED') return <span className="badge badge-high">Verified</span>;
    if (status === 'SCHEDULED') return <span className="badge badge-medium">Scheduled</span>;
    if (status === 'CORROBORATED') return <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>Corroborated</span>;
    return <span className="badge badge-status">Candidate</span>;
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      {/* Controls Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1', minWidth: '260px' }}>
          {/* Search */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '8px 14px',
              flex: '1',
            }}
          >
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder="Search by defect ID, type, coordinate..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#f8fafc',
                fontSize: '0.875rem',
                width: '100%',
                fontFamily: 'var(--font-sans)',
              }}
            />
          </div>
        </div>

        {/* Filters and Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            style={{
              background: 'var(--bg-secondary)',
              color: '#cbd5e1',
              border: '1px solid var(--border-subtle)',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value)}
            style={{
              background: 'var(--bg-secondary)',
              color: '#cbd5e1',
              border: '1px solid var(--border-subtle)',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {types.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          {/* Sort order */}
          <select
            value={sortOrder}
            onChange={(e) => onSortOrderChange(e.target.value)}
            style={{
              background: 'var(--bg-secondary)',
              color: '#cbd5e1',
              border: '1px solid var(--border-subtle)',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="priority">Sort by Priority (High to Low)</option>
            <option value="recency">Sort by Last Updated</option>
            <option value="observations">Sort by Most Reports</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr
              style={{
                borderBottom: '1px solid var(--border-subtle)',
                color: '#64748b',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              <th style={{ padding: '12px 14px' }}>Defect ID</th>
              <th style={{ padding: '12px 14px' }}>Type</th>
              <th style={{ padding: '12px 14px' }}>Centroid Location</th>
              <th style={{ padding: '12px 14px' }}>Priority Score</th>
              <th style={{ padding: '12px 14px' }}>Status</th>
              <th style={{ padding: '12px 14px' }}>Evidence Reports</th>
              <th style={{ padding: '12px 14px' }}>Last Updated</th>
              <th style={{ padding: '12px 14px', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                  <AlertCircle size={28} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.5 }} />
                  No defects matching current filter criteria.
                </td>
              </tr>
            ) : (
              filtered.map((defect) => {
                const isSelected = selectedDefectId === defect.id;
                return (
                  <tr
                    key={defect.id}
                    onClick={() => onSelectDefect(defect.id)}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(56, 189, 248, 0.08)' : 'transparent',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <td style={{ padding: '14px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 600, color: '#38bdf8' }}>
                      {defect.id}
                    </td>
                    <td style={{ padding: '14px', fontSize: '0.85rem', fontWeight: 500, color: '#f1f5f9' }}>
                      {defect.defect_type}
                    </td>
                    <td style={{ padding: '14px', fontSize: '0.8rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                      {defect.latitude.toFixed(4)}, {defect.longitude.toFixed(4)}
                    </td>
                    <td style={{ padding: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`badge ${getPriorityBadgeClass(defect.priority_score)}`}>
                          {defect.priority_score}
                        </span>
                        <div
                          style={{
                            width: '40px',
                            height: '4px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '2px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${defect.priority_score}%`,
                              height: '100%',
                              backgroundColor:
                                defect.priority_score >= 75
                                  ? '#ef4444'
                                  : defect.priority_score >= 50
                                  ? '#f97316'
                                  : defect.priority_score >= 25
                                  ? '#eab308'
                                  : '#3b82f6',
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px' }}>
                      {getStatusBadge(defect.status)}
                    </td>
                    <td style={{ padding: '14px', fontSize: '0.85rem', color: '#cbd5e1' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: defect.observation_count > 1 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                          color: defect.observation_count > 1 ? '#34d399' : '#94a3b8',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {defect.observation_count} obs
                      </span>
                    </td>
                    <td style={{ padding: '14px', fontSize: '0.75rem', color: '#64748b' }}>
                      {new Date(defect.last_updated).toLocaleString()}
                    </td>
                    <td style={{ padding: '14px', textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDefect(defect.id);
                        }}
                      >
                        <span>Triage</span>
                        <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
