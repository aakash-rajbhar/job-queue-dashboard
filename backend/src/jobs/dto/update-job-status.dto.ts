import { IsIn, IsNotEmpty } from 'class-validator';
import { JOB_STATUSES, JobStatus } from '../job.types';

export class UpdateJobStatusDto {
  @IsIn(JOB_STATUSES)
  @IsNotEmpty()
  status: JobStatus;
}