import { useState } from 'react';
import type { Job, JobStatus } from '../types/job';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Check, CircleX, Loader2, Play, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  jobs: Job[];
  onUpdateStatus: (id: string, status: JobStatus) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

const NEXT_STATUS: Record<
  JobStatus,
  { label: string; value: JobStatus; icon: React.ReactNode }[]
> = {
  pending: [{ label: 'Run', value: 'running', icon: <Play /> }],
  running: [
    { label: 'Complete', value: 'completed', icon: <Check /> },
    { label: 'Fail', value: 'failed', icon: <CircleX /> },
  ],
  completed: [],
  failed: [],
};

const STATUS_META: Record<JobStatus, { dot: string; text: string }> = {
  pending: {
    dot: 'bg-amber-500 dark:bg-amber-400',
    text: 'text-amber-600 dark:text-amber-400',
  },
  running: {
    dot: 'bg-sky-500 dark:bg-sky-400 animate-pulse',
    text: 'text-sky-600 dark:text-sky-400',
  },
  completed: {
    dot: 'bg-emerald-500 dark:bg-emerald-400',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  failed: {
    dot: 'bg-red-500 dark:bg-red-400',
    text: 'text-red-600 dark:text-red-400',
  },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function Spinner() {
  return <Loader2 className="size-3.5 animate-spin" />;
}

export function JobList({ jobs, onUpdateStatus, onDelete }: Props) {
  const [busy, setBusy] = useState<{ id: string; action: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);

  const isBusy = (id: string) => busy?.id === id;

  const handleUpdate = async (id: string, status: JobStatus) => {
    setBusy({ id, action: `update:${status}` });
    try {
      await onUpdateStatus(id, status);
    } finally {
      setBusy(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setBusy({ id: deleteTarget.id, action: 'delete' });
    try {
      const ok = await onDelete(deleteTarget.id);
      if (ok) setDeleteTarget(null);
    } finally {
      setBusy(null);
    }
  };

  if (jobs.length === 0) return null;

  return (
    <>
      <div className="overflow-hidden rounded-xl border bg-card">
        {jobs.map((job) => {
          const meta = STATUS_META[job.status];
          const actions = NEXT_STATUS[job.status];
          const rowBusy = busy?.id === job.id;

          return (
            <div
              key={job.id}
              className={cn(
                'flex flex-col gap-3 border-b border-border bg-card px-5 py-4 transition-colors',
                'last:border-b-0 sm:flex-row sm:items-center sm:gap-4',
                'hover:bg-secondary/50',
              )}
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span
                  aria-hidden
                  className={cn('mt-1.5 size-2 shrink-0 rounded-full', meta.dot)}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm leading-snug font-medium text-foreground">
                    {job.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="font-medium tracking-wide uppercase">
                      {job.type}
                    </span>
                    <span aria-hidden className="opacity-40">
                      ·
                    </span>
                    <time className="tabular-nums" dateTime={job.createdAt}>
                      {formatDate(job.createdAt)}
                    </time>
                    <span aria-hidden className="opacity-40">
                      ·
                    </span>
                    <span className={cn('capitalize', meta.text)}>
                      {job.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {actions.map((next) => (
                  <Button
                    key={next.value}
                    size="sm"
                    variant={next.value === 'failed' ? 'ghost' : 'default'}
                    disabled={rowBusy}
                    onClick={() => handleUpdate(job.id, next.value)}
                    className={
                      next.value === 'completed'
                        ? 'bg-emerald-600 hover:bg-emerald-600/90 dark:bg-emerald-500 dark:hover:bg-emerald-500/90'
                        : next.value === 'failed'
                          ? 'text-destructive dark:text-red-400'
                          : ''
                    }
                  >
                    {busy?.id === job.id && busy.action === `update:${next.value}` ? (
                      <Spinner />
                    ) : (
                      next.icon
                    )}
                    {next.label}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={rowBusy}
                  onClick={() => setDeleteTarget(job)}
                  className="text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
                  aria-label={`Delete ${job.title}`}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete job?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes “{deleteTarget?.title}”. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleteTarget !== null && isBusy(deleteTarget.id)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteTarget !== null && isBusy(deleteTarget.id)}
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteConfirm();
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteTarget !== null && isBusy(deleteTarget.id) ? (
                <Spinner />
              ) : (
                <Trash2 />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}