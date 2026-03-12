/** API client for the wearable data pipeline backend. */

const BASE = '';

export interface PayloadRow {
  id: number;
  device_type: string;
  data_category: string;
  payload: Record<string, unknown>;
  content_hash: string;
  data_start_time: string | null;
  data_end_time: string | null;
  api_endpoint: string | null;
  ingestion_method: string | null;
  source_file_name: string | null;
  ingested_at: string | null;
}

export interface PayloadListResponse {
  total: number;
  limit: number;
  offset: number;
  data: PayloadRow[];
}

export interface DeviceStat {
  device_type: string;
  data_category: string;
  count: number;
  first_ingested: string | null;
  last_ingested: string | null;
}

export interface StatsResponse {
  total_payloads: number;
  device_stats: DeviceStat[];
  recent_logs: Record<string, unknown>[];
  recent_uploads: Record<string, unknown>[];
  oauth_tokens: { device_type: string; expires_at: string | null; updated_at: string | null }[];
}

export interface CategoryRow {
  device_type: string;
  data_category: string;
  count: number;
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(BASE + url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export const api = {
  stats: (userId = 'default') => get<StatsResponse>(`/api/stats?user_id=${userId}`),

  payloads: (params: {
    userId?: string;
    deviceType?: string;
    dataCategory?: string;
    limit?: number;
    offset?: number;
  }) => {
    const q = new URLSearchParams();
    q.set('user_id', params.userId ?? 'default');
    if (params.deviceType) q.set('device_type', params.deviceType);
    if (params.dataCategory) q.set('data_category', params.dataCategory);
    q.set('limit', String(params.limit ?? 50));
    q.set('offset', String(params.offset ?? 0));
    return get<PayloadListResponse>(`/api/payloads?${q}`);
  },

  payload: (id: number) => get<PayloadRow>(`/api/payload/${id}`),

  categories: (userId = 'default') =>
    get<CategoryRow[]>(`/api/categories?user_id=${userId}`),

  health: () => get<{ status: string; total_payloads: number; devices: unknown[] }>('/'),
};
