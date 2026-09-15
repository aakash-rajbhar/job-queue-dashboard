import { useState } from 'react';
import type { Job, JobStatus } from '../types/job';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Check, Circle, CircleX, Loader2, Play, Trash2 } from 'lucide-react';

interface Props {
  jobs: Job[];
  onUpdateStatus: (id: string, status: JobStatus) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

const NEXT_STATUS: Record<
  JobStatus,
  { label: string; value: JobStatus; icon: React.ReactNode }[]
> = {
  pending: [{ label: 'Start', value: 'running', icon: <Play /> }],
  running: [
    { label: 'Complete', value: 'completed', icon: <Check /> },
    { label: 'Fail', value: 'failed', icon: <CircleX /> },
  ],
  completed: [],
  failed: [],
};

const STATUS_CONFIG: Record<JobStatus, { badge: string; icon: React.ReactNode }> = {
  pending: {
    badge: 'border-amber-300 bg-amber-50 text-amber-700',
    icon: <Circle />,
  },
  running: {
    badge: 'border-blue-300 bg-blue-50 text-blue-700',
    icon: <Circle className="animate-pulse" />,
  },
  completed: {
    badge: 'border-emerald-300 bg-emerald-50 text-emerald-700',
    icon: <Check />,
  },
  failed: {
    badge: 'border-red-300 bg-red-50 text-red-700',
    icon: <CircleX />,
  },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString();
}

function Spinner() {
  return <Loader2 className="animate-spin" />;
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

  if (jobs.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No jobs found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => {
        const actions = NEXT_STATUS[job.status];
        const statusStyle = STATUS_CONFIG[job.status];
        const rowBusy = busy?.id === job.id;

        return (
          <Card key={job.id} className="gap-0 py-4">
            <CardContent className="flex items-start justify-between gap-4 px-6">
              <div className="min-w-0 space-y-1 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{job.title}</span>
                </div>
                <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <span className="capitalize">{job.type}</span>
                  <span aria-hidden className="opacity-50">
                    ·
                  </span>
                  <time dateTime={job.createdAt}>{formatDate(job.createdAt)}</time>
                </div>
              </div>
              <Badge variant="outline" className={statusStyle.badge}>
                {statusStyle.icon}
                {job.status}
              </Badge>
            </CardContent>
            <CardFooter className="gap-2 px-6 pt-0">
              {actions.map((next) => (
                <Button
                  key={next.value}
                  variant="outline"
                  size="sm"
                  disabled={rowBusy}
                  onClick={() => handleUpdate(job.id, next.value)}
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
                className="ml-auto text-destructive hover:text-destructive"
                disabled={rowBusy}
                onClick={() => setDeleteTarget(job)}
              >
                <Trash2 />
                Delete
              </Button>
            </CardFooter>
          </Card>
        );
      })}

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete job?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes “{deleteTarget?.title}”. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteTarget !== null && isBusy(deleteTarget.id)}>
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
    </div>
  );
}