import {
  AuthResponse,
  DashboardStats,
  DefectDetail,
  DefectListResponse,
  DefectStatus,
  ObservationOut,
  User,
} from '../types';

const API_BASE = '/api';

// Token storage helpers
const TOKEN_KEY = 'roadguard_auth_token';
const USER_KEY = 'roadguard_auth_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredSession(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Auth Endpoints ───────────────────────────────────────────────────────────

export async function loginApi(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Login failed');
  }
  const data: AuthResponse = await res.json();
  setStoredSession(data.access_token, data.user);
  return data;
}

export async function registerApi(name: string, email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Registration failed');
  }
  const data: AuthResponse = await res.json();
  setStoredSession(data.access_token, data.user);
  return data;
}

export async function fetchMe(): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) {
    throw new Error('Not authenticated');
  }
  return res.json();
}

// ── Admin Endpoints ──────────────────────────────────────────────────────────

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE}/defects/stats/summary`, {
    headers: { ...authHeaders() },
  });
  if (res.status === 403) {
    throw new Error('403 Forbidden: Administrator role required');
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch stats: ${res.statusText}`);
  }
  return res.json();
}

export async function updateDefectStatus(
  id: string,
  status: DefectStatus
): Promise<{ id: string; status: string; updated_at: string }> {
  const res = await fetch(`${API_BASE}/defects/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ status }),
  });
  if (res.status === 403) {
    throw new Error('403 Forbidden: Only Admin / Authority can change defect status');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Failed to update defect status`);
  }
  return res.json();
}

export async function verifyRepairApi(id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/defects/${id}/verify-repair`, {
    method: 'POST',
    headers: { ...authHeaders() },
  });
  if (res.status === 403) {
    throw new Error('403 Forbidden: Only Admin / Authority can verify repairs');
  }
  if (!res.ok) {
    throw new Error(`Failed to verify repair`);
  }
  return res.json();
}

export async function reviewDetectionApi(
  id: string,
  action: 'CONFIRM' | 'REJECT' | 'NEEDS_REVIEW'
): Promise<any> {
  const res = await fetch(`${API_BASE}/defects/${id}/review-detection?action=${action}`, {
    method: 'POST',
    headers: { ...authHeaders() },
  });
  if (res.status === 403) {
    throw new Error('403 Forbidden: Only Admin can review AI detection');
  }
  if (!res.ok) {
    throw new Error(`Failed to review detection`);
  }
  return res.json();
}

// ── Shared & Citizen Endpoints ───────────────────────────────────────────────

export async function fetchDefects(params?: {
  status?: string;
  defect_type?: string;
  min_priority?: number;
  sort?: string;
  limit?: number;
  offset?: number;
}): Promise<DefectListResponse> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.defect_type) query.set('defect_type', params.defect_type);
  if (params?.min_priority !== undefined)
    query.set('min_priority', String(params.min_priority));
  if (params?.sort) query.set('sort', params.sort);
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));

  const res = await fetch(`${API_BASE}/defects?${query.toString()}`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch defects: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchDefectDetail(id: string): Promise<DefectDetail> {
  const res = await fetch(`${API_BASE}/defects/${id}`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch defect ${id}: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchMyReports(): Promise<ObservationOut[]> {
  const res = await fetch(`${API_BASE}/observations/my`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch my reports: ${res.statusText}`);
  }
  return res.json();
}

export async function submitObservationApi(formData: FormData): Promise<any> {
  const res = await fetch(`${API_BASE}/observations`, {
    method: 'POST',
    headers: { ...authHeaders() },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to submit observation');
  }
  return res.json();
}

export async function seedDemoData(): Promise<{ message: string; count: number }> {
  const res = await fetch(`${API_BASE}/seed`, {
    method: 'POST',
    headers: { ...authHeaders() },
  });
  if (!res.ok) {
    throw new Error(`Failed to seed data: ${res.statusText}`);
  }
  return res.json();
}
