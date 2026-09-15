export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export type JobType = 'email' | 'report' | 'sync' | 'export';

export interface Job {
  id: string;
  title: string;
  type: JobType;
  status: JobStatus;
  createdAt: string;
  version: number;
}

export interface JobCounts {
  pending: number;
  running: number;
  completed: number;
  failed: number;
}

export interface Paginated<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}