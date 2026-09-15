import { Transform } from 'class-transformer';
import { IsString, IsIn, IsNotEmpty } from 'class-validator';
import { JOB_TYPES, JobType } from '../job.types';

export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title: string;

  @IsIn(JOB_TYPES)
  type: JobType;
}