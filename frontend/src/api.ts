import type { Job, JobCounts, JobStatus, JobType, Paginated } from './types/job';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body?.message || `Request failed (${res.status})`;
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface ListJobsParams {
  status?: JobStatus;
  page?: number;
  pageSize?: number;
}

export const api = {
  getJobs: ({ status, page, pageSize }: ListJobsParams = {}) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (page) params.set('page', String(page));
    if (pageSize) params.set('pageSize', String(pageSize));

    const query = params.toString();
    return request<Paginated<Job>>(`/jobs${query ? `?${query}` : ''}`);
  },

  getJobCounts: () => request<JobCounts>('/jobs/counts'),

  createJob: (title: string, type: JobType) =>
    request<Job>('/jobs', {
      method: 'POST',
      body: JSON.stringify({ title, type }),
    }),

  updateJobStatus: (id: string, status: JobStatus) =>
    request<Job>(`/jobs/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  deleteJob: (id: string) =>
    request<void>(`/jobs/${id}`, { method: 'DELETE' }),
};