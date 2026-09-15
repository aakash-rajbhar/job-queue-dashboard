import type { JobCounts, JobStatus } from '../types/job';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Props {
  counts: JobCounts;
  activeFilter: JobStatus | undefined;
  onFilterChange: (status: JobStatus | undefined) => void;
}

const STATUSES: JobStatus[] = ['pending', 'running', 'completed', 'failed'];

const STATUS_LABEL: Record<JobStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
};

export function StatusFilters({ counts, activeFilter, onFilterChange }: Props) {
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant={activeFilter === undefined ? 'default' : 'outline'}
        onClick={() => onFilterChange(undefined)}
      >
        All
        <CountBadge>{total}</CountBadge>
      </Button>
      {STATUSES.map((status) => (
        <Button
          key={status}
          size="sm"
          variant={activeFilter === status ? 'default' : 'outline'}
          onClick={() => onFilterChange(status)}
        >
          {STATUS_LABEL[status]}
          <CountBadge>{counts[status]}</CountBadge>
        </Button>
      ))}
    </div>
  );
}

function CountBadge({ children }: { children: number }) {
  return <Badge variant="secondary">{children}</Badge>;
}