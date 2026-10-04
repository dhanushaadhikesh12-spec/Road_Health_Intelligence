import React, { useEffect, useState, useCallback } from 'react';
import { Header } from './components/Header';
import { StatsGrid } from './components/StatsGrid';
import { DefectMap } from './components/DefectMap';
import { DefectTable } from './components/DefectTable';
import { DefectDrawer } from './components/DefectDrawer';
import { RoleSelectScreen } from './components/RoleSelectScreen';
import { CitizenHome } from './components/CitizenHome';
import {
  fetchDashboardStats,
  fetchDefects,
  fetchDefectDetail,
  updateDefectStatus,
  seedDemoData,
  getStoredUser,
  fetchMe,
  clearStoredSession,
} from './services/api';
import {
  DashboardStats,
  DefectSummary,
  DefectDetail,
  DefectStatus,
  User,
} from './types';
import { Shield, UserCheck, AlertTriangle } from 'lucide-react';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(getStoredUser());
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [defects, setDefects] = useState<DefectSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Filters & selection for admin
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('priority');

  const [selectedDefectId, setSelectedDefectId] = useState<string | null>(null);
  const [selectedDefectDetail, setSelectedDefectDetail] = useState<DefectDetail | null>(null);

  // Validate session on load
  useEffect(() => {
    if (currentUser) {
      fetchMe()
        .then((user) => setCurrentUser(user))
        .catch(() => {
          clearStoredSession();
          setCurrentUser(null);
        });
    }
  }, []);

  // Load admin data (Only if current user is ADMIN)
  const loadAdminData = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'ADMIN') return;

    setLoading(true);
    setAuthError(null);
    try {
      const [statsRes, defectsRes] = await Promise.all([
        fetchDashboardStats(),
        fetchDefects({
          status: statusFilter || undefined,
          defect_type: typeFilter || undefined,
          sort: sortOrder,
          limit: 100,
        }),
      ]);

      setStats(statsRes);
      setDefects(defectsRes.defects);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      if (err.message && err.message.includes('403')) {
        setAuthError('Access Denied: 403 Forbidden. Administrator role required on backend.');
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser, statusFilter, typeFilter, sortOrder]);

  useEffect(() => {
    if (currentUser?.role === 'ADMIN') {
      loadAdminData();
    }
  }, [currentUser, loadAdminData]);

  // Load detail when defect is selected
  useEffect(() => {
    if (!selectedDefectId) {
      setSelectedDefectDetail(null);
      return;
    }

    fetchDefectDetail(selectedDefectId)
      .then((detail) => setSelectedDefectDetail(detail))
      .catch((err) => console.error('Failed to load defect detail:', err));
  }, [selectedDefectId]);

  // Handle status update from drawer
  const handleUpdateStatus = async (id: string, newStatus: DefectStatus) => {
    try {
      await updateDefectStatus(id, newStatus);
      const updated = await fetchDefectDetail(id);
      setSelectedDefectDetail(updated);
      loadAdminData();
    } catch (err: any) {
      console.error('Failed to update status:', err);
      alert(err.message || 'Error updating status');
    }
  };

  // Handle seed demo data
  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await seedDemoData();
      await loadAdminData();
    } catch (err) {
      console.error('Failed to seed demo data:', err);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleLogout = () => {
    clearStoredSession();
    setCurrentUser(null);
    setSelectedDefectId(null);
    setSelectedDefectDetail(null);
  };

  // 1. Not Authenticated -> Show Role Select & Authentication Screen
  if (!currentUser) {
    return <RoleSelectScreen onLoginSuccess={setCurrentUser} />;
  }

  // 2. Authenticated as CITIZEN -> Citizen Home View (Section 109.9)
  if (currentUser.role === 'CITIZEN') {
    return <CitizenHome user={currentUser} onLogout={handleLogout} />;
  }

  // 3. Authenticated as ADMIN -> Authority Command Center (Section 109.8)
  return (
    <div style={{ padding: '24px 32px', maxWidth: '1600px', margin: '0 auto', position: 'relative' }}>
      <Header
        stats={stats}
        loading={loading}
        onRefresh={loadAdminData}
        onSeed={handleSeed}
        isSeeding={isSeeding}
        user={currentUser}
        onLogout={handleLogout}
      />

      {authError && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171',
            padding: '16px',
            borderRadius: '10px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <AlertTriangle size={20} />
          <span>{authError}</span>
        </div>
      )}

      <StatsGrid stats={stats} />

      <DefectMap
        defects={defects}
        selectedDefectId={selectedDefectId}
        onSelectDefect={setSelectedDefectId}
      />

      <DefectTable
        defects={defects}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
        onSelectDefect={setSelectedDefectId}
        selectedDefectId={selectedDefectId}
      />

      {selectedDefectDetail && (
        <DefectDrawer
          defect={selectedDefectDetail}
          onClose={() => setSelectedDefectId(null)}
          onUpdateStatus={handleUpdateStatus}
        />
      )}
    </div>
  );
};

export default App;
