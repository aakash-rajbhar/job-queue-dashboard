import {
  JobStatus as PrismaStatus,
  JobType as PrismaType,
} from '../generated/prisma/client';

export const JOB_STATUSES = ['pending', 'running', 'completed', 'failed'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_TYPES = ['email', 'report', 'sync', 'export'] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  pending: ['running'],
  running: ['completed', 'failed'],
  completed: [],
  failed: [],
};

export const toPrismaStatus: Record<JobStatus, PrismaStatus> = {
  pending: PrismaStatus.PENDING,
  running: PrismaStatus.RUNNING,
  completed: PrismaStatus.COMPLETED,
  failed: PrismaStatus.FAILED,
};

export const toPrismaType: Record<JobType, PrismaType> = {
  email: PrismaType.EMAIL,
  report: PrismaType.REPORT,
  sync: PrismaType.SYNC,
  export: PrismaType.EXPORT,
};

export const toApiStatus: Record<PrismaStatus, JobStatus> = {
  [PrismaStatus.PENDING]: 'pending',
  [PrismaStatus.RUNNING]: 'running',
  [PrismaStatus.COMPLETED]: 'completed',
  [PrismaStatus.FAILED]: 'failed',
};

export const toApiType: Record<PrismaType, JobType> = {
  [PrismaType.EMAIL]: 'email',
  [PrismaType.REPORT]: 'report',
  [PrismaType.SYNC]: 'sync',
  [PrismaType.EXPORT]: 'export',
};

export interface ApiJob {
  id: string;
  title: string;
  type: JobType;
  status: JobStatus;
  createdAt: Date;
  version: number;
}

export function toApiJob(job: {
  id: string;
  title: string;
  type: PrismaType;
  status: PrismaStatus;
  createdAt: Date;
  version: number;
}): ApiJob {
  return {
    id: job.id,
    title: job.title,
    type: toApiType[job.type],
    status: toApiStatus[job.status],
    createdAt: job.createdAt,
    version: job.version,
  };
}