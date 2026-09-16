import type { JobCounts, JobStatus } from '../types/job';
import { cn } from '@/lib/utils';

interface Props {
  counts: JobCounts;
  activeFilter: JobStatus | undefined;
  onFilterChange: (status: JobStatus | undefined) => void;
}

type TabKey = JobStatus | 'all';

interface Tab {
  key: TabKey;
  label: string;
  dot: string;
  activeBg: string;
  bar: string;
}

const TABS: Tab[] = [
  {
    key: 'all',
    label: 'All',
    dot: 'bg-foreground/70',
    activeBg: 'bg-primary/10',
    bar: 'bg-primary',
  },
  {
    key: 'pending',
    label: 'Pending',
    dot: 'bg-amber-500 dark:bg-amber-400',
    activeBg: 'bg-amber-500/10',
    bar: 'bg-amber-500 dark:bg-amber-400',
  },
  {
    key: 'running',
    label: 'Running',
    dot: 'bg-sky-500 dark:bg-sky-400',
    activeBg: 'bg-sky-500/10',
    bar: 'bg-sky-500 dark:bg-sky-400',
  },
  {
    key: 'completed',
    label: 'Completed',
    dot: 'bg-emerald-500 dark:bg-emerald-400',
    activeBg: 'bg-emerald-500/10',
    bar: 'bg-emerald-500 dark:bg-emerald-400',
  },
  {
    key: 'failed',
    label: 'Failed',
    dot: 'bg-red-500 dark:bg-red-400',
    activeBg: 'bg-red-500/10',
    bar: 'bg-red-500 dark:bg-red-400',
  },
];

export function StatusFilters({ counts, activeFilter, onFilterChange }: Props) {
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const values: Record<TabKey, number> = { all: total, ...counts };

  return (
    <div
      className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-5"
      role="group"
      aria-label="Filter jobs by status"
    >
      {TABS.map((tab) => {
        const isActive =
          tab.key === 'all' ? activeFilter === undefined : activeFilter === tab.key;

        return (
          <button
            key={tab.key}
            type="button"
            aria-pressed={isActive}
            onClick={() =>
              onFilterChange(tab.key === 'all' ? undefined : (tab.key as JobStatus))
            }
            className={cn(
              'relative flex cursor-pointer flex-col items-start gap-1.5 bg-card px-4 py-3 text-left transition-colors',
              isActive ? tab.activeBg : 'hover:bg-secondary/80',
            )}
          >
            {isActive && (
              <span
                aria-hidden
                className={cn('absolute inset-x-0 top-0 h-0.5', tab.bar)}
              />
            )}
            <span
              className={cn(
                'flex items-center gap-1.5 text-[11px] font-medium tracking-wider uppercase',
                isActive ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              <span className={cn('size-1.5 rounded-full', tab.dot)} />
              {tab.label}
            </span>
            <span
              className={cn(
                'text-2xl leading-none font-semibold tabular-nums',
                isActive ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {values[tab.key]}
            </span>
          </button>
        );
      })}
    </div>
  );
}