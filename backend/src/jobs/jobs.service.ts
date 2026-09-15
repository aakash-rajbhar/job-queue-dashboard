import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobStatus as PrismaStatus } from '../generated/prisma/client';
import { CreateJobDto } from './dto/create-job.dto';
import { ListJobsQueryDto } from './dto/list-jobs-query.dto';
import {
  ApiJob,
  JobStatus,
  VALID_TRANSITIONS,
  toApiJob,
  toApiStatus,
  toPrismaStatus,
  toPrismaType,
} from './job.types';

export interface PaginatedJobs {
  data: ApiJob[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateJobDto): Promise<ApiJob> {
    const job = await this.prisma.job.create({
      data: {
        title: dto.title,
        type: toPrismaType[dto.type],
      },
    });
    return toApiJob(job);
  }

  async findAll(query: ListJobsQueryDto): Promise<PaginatedJobs> {
    const where = query.status
      ? { status: toPrismaStatus[query.status] }
      : undefined;

    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        where,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.job.count({ where }),
    ]);

    return {
      data: jobs.map(toApiJob),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async getCounts(): Promise<Record<JobStatus, number>> {
    const groups = await this.prisma.job.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    const result: Record<JobStatus, number> = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
    };

    for (const group of groups) {
      result[toApiStatus[group.status as PrismaStatus]] = group._count._all;
    }

    return result;
  }

  async updateStatus(id: string, newStatus: JobStatus): Promise<ApiJob> {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) {
      throw new NotFoundException(`Job with id ${id} not found`);
    }

    const currentStatus = toApiStatus[job.status];
    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition job from "${currentStatus}" to "${newStatus}". ` +
          `Allowed transitions: ${allowed.length ? allowed.join(', ') : 'none (terminal state)'}`,
      );
    }

    // Optimistic concurrency control using a version column.
    // If two requests read the same version and both try to update, only
    // the first one matches the WHERE clause (id + version) and succeeds;
    // the second affects zero rows and returns 409. PostgreSQL executes
    // updateMany as a single conditional UPDATE, so the version check is
    // atomic even under a race between two tabs calling the API directly.
    const result = await this.prisma.job.updateMany({
      where: { id, version: job.version },
      data: { status: toPrismaStatus[newStatus], version: { increment: 1 } },
    });

    if (result.count === 0) {
      throw new ConflictException(
        'This job was modified by another request. Refresh and try again.',
      );
    }

    const updated = await this.prisma.job.findUnique({ where: { id } });
    return toApiJob(updated!);
  }

  async remove(id: string): Promise<void> {
    // Use deleteMany so a concurrent delete of an already-gone job returns
    // 0 affected rows instead of throwing a Prisma P2025 exception (which
    // would surface as an uncaught 500).  The controller maps 0 rows to 404.
    const result = await this.prisma.job.deleteMany({ where: { id } });
    if (result.count === 0) {
      throw new NotFoundException(`Job with id ${id} not found`);
    }
  }
} 