import { useJobs } from '@/hooks/useJobs';
import { CreateJobForm } from '@/components/CreateJobForm';
import { JobList } from '@/components/JobList';
import { StatusFilters } from '@/components/StatusFilters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { AlertCircle } from 'lucide-react';

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

export function App() {
  const {
    jobs,
    counts,
    page,
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

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-xl font-semibold tracking-tight">Job Queue</h1>

      
      <Card>
        <CardHeader className="px-6 pt-6 pb-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Create a job
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6 pt-2">
          <CreateJobForm onSubmit={createJob} disabled={loading} />
        </CardContent>
      </Card>
      <StatusFilters
        counts={counts}
        activeFilter={filter}
        onFilterChange={selectFilter}
      />


      {actionError && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Card key={i} className="gap-0 py-4">
              <CardContent className="space-y-3 px-6">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
                <div className="flex gap-2 pt-1">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <JobList
            jobs={jobs}
            onUpdateStatus={updateStatus}
            onDelete={deleteJob}
          />
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
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
                        onClick={() => setPage(item)}
                      >
                        {item}
                      </PaginationLink>
                    </PaginationItem>
                  ),
                )}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
}