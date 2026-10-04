export type UserRole = 'CITIZEN' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export type DefectType = 'POTHOLE' | 'CRACK' | 'RUTTING' | 'SURFACE_WEAR' | 'OTHER';

export type DefectStatus =
  | 'CANDIDATE'
  | 'CORROBORATED'
  | 'VERIFIED'
  | 'SCHEDULED'
  | 'REPAIRED'
  | 'RECURRED';

export type PriorityTier = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface PriorityFactor {
  value: number;
  weight: number;
  points: number;
  note: string;
}

export interface PriorityBreakdown {
  severity: PriorityFactor;
  confidence: PriorityFactor;
  observation_support: PriorityFactor;
  recency: PriorityFactor;
  road_context: PriorityFactor;
}

export interface ObservationOut {
  id: string;
  defect_id: string;
  image_url: string | null;
  defect_type: DefectType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'SEVERE';
  confidence: number | null;
  classification_source: string;
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
  location_source: string;
  duplicate_decision: 'MERGE' | 'REVIEW' | 'DISTINCT';
  duplicate_score: number | null;
  duplicate_distance_meters: number | null;
  motion_score: number | null;
  description: string | null;
  timestamp: string;
  created_at: string;
}

export interface DefectSummary {
  id: string;
  defect_type: DefectType;
  latitude: number;
  longitude: number;
  status: DefectStatus;
  priority_score: number;
  observation_count: number;
  first_detected: string;
  last_updated: string;
  verification_status: string | null;
}

export interface DefectDetail {
  id: string;
  defect_type: DefectType;
  latitude: number;
  longitude: number;
  status: DefectStatus;
  priority_score: number;
  priority_breakdown: PriorityBreakdown | null;
  priority_computed_at: string | null;
  observation_count: number;
  first_detected: string;
  last_updated: string;
  before_image_url: string | null;
  after_image_url: string | null;
  verification_status: string | null;
  assigned_at: string | null;
  repair_started: string | null;
  repair_completed: string | null;
  verified_at: string | null;
  observations: ObservationOut[];
}

export interface DashboardStats {
  total_observations: number;
  unique_defects: number;
  duplicate_observations: number;
  critical_defects: number;
  high_priority_defects: number;
  under_repair: number;
  resolved: number;
  road_health_score: number;
}

export interface DefectListResponse {
  defects: DefectSummary[];
  total: number;
  limit: number;
  offset: number;
}
