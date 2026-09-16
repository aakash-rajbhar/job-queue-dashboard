import { useJobs } from '@/hooks/useJobs';
import { useTheme } from '@/hooks/useTheme';
import { CreateJobForm } from '@/components/CreateJobForm';
import { JobList } from '@/components/JobList';
import { StatusFilters } from '@/components/StatusFilters';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { AlertCircle, Cpu, Inbox } from 'lucide-react';
import type { JobStatus } from '@/types/job';

function pageItems(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7)
    return Array.from({ length: total }, (_, i) => i + 1);

  const items: (number | 'ellipsis')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) items.push('ellipsis');
  for (let i = start; i <= end; i++) items.push(i);
  if (end < total - 1) items.push('ellipsis');
  items.push(total);

  return items;
}

interface PagerProps {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}

function Pager({ page, totalPages, onPage }: PagerProps) {
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => onPage(Math.max(1, page - 1))}
            className={page <= 1 ? 'pointer-events-none opacity-40' : ''}
          />
        </PaginationItem>
        {pageItems(page, totalPages).map((item, i) =>
          item === 'ellipsis' ? (
            <PaginationItem key={`e${i}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={item}>
              <PaginationLink
                isActive={item === page}
                onClick={() => onPage(item)}
                className={
                  item === page
                    ? 'border-transparent bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground'
                    : ''
                }
              >
                {item}
              </PaginationLink>
            </PaginationItem>
          ),
        )}
        <PaginationItem>
          <PaginationNext
            onClick={() => onPage(Math.min(totalPages, page + 1))}
            className={
              page >= totalPages ? 'pointer-events-none opacity-40' : ''
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

function JobsSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border">
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-border bg-card px-5 py-4 last:border-b-0"
        >
          <Skeleton className="size-2 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5 rounded" />
            <Skeleton className="h-3 w-1/4 rounded" />
          </div>
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  filter,
  onClear,
}: {
  filter: JobStatus | undefined;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-16 text-center">
      <div className="mb-4 flex size-11 items-center justify-center rounded-lg border bg-secondary text-muted-foreground">
        <Inbox className="size-5" />
      </div>
      <p className="text-sm font-medium">
        {filter ? 'No jobs in this status' : 'No jobs yet'}
      </p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        {filter
          ? 'Nothing here right now. Clear the filter to see all jobs.'
          : 'Use the box above to queue your first job.'}
      </p>
      {filter !== undefined && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onClear}>
          Clear filter
        </Button>
      )}
    </div>
  );
}

export function App() {
  const {
    jobs,
    counts,
    page,
    total,
    totalPages,
    loading,
    error,
    actionError,
    filter,
    selectFilter,
    setPage,
    createJob,
    updateStatus,
    deleteJob,
  } = useJobs();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Cpu className="size-4" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight">Job Queue</p>
              <p className="text-[11px] text-muted-foreground">
                Operations console
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
              </span>
              Live
            </span>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Jobs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create, run, and monitor background work.
          </p>
        </div>

        <StatusFilters
          counts={counts}
          activeFilter={filter}
          onFilterChange={selectFilter}
        />

        <div className="mt-6">
          <CreateJobForm onSubmit={createJob} disabled={loading} />
        </div>

        {actionError && (
          <div className="mt-6">
            <Alert
              variant="destructive"
              className="border-red-500/30 bg-red-500/10 text-red-600 dark:border-red-400/30 dark:text-red-400"
            >
              <AlertCircle className="size-4" />
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          </div>
        )}

        {error && (
          <div className="mt-6">
            <Alert
              variant="destructive"
              className="border-red-500/30 bg-red-500/10 text-red-600 dark:border-red-400/30 dark:text-red-400"
            >
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        <div className="mt-6">
          {loading ? (
            <JobsSkeleton />
          ) : (
            <>
              <JobList
                jobs={jobs}
                onUpdateStatus={updateStatus}
                onDelete={deleteJob}
              />
              {jobs.length === 0 ? (
                <EmptyState
                  filter={filter}
                  onClear={() => selectFilter(undefined)}
                />
              ) : (
                <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                  Showing {jobs.length} of {total} job{total === 1 ? '' : 's'}
                </p>
              )}
              {totalPages > 1 && (
                <div className="mt-5">
                  <Pager page={page} totalPages={totalPages} onPage={setPage} />
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <footer className="border-t border-border py-6">
        <p className="px-4 text-center text-xs text-muted-foreground">
          Job Queue · status machine with optimistic concurrency
        </p>
      </footer>
    </div>
  );
}