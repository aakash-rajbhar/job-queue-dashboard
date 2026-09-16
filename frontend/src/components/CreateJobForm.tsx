import { useState } from 'react';
import type { JobType } from '../types/job';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowRight, Plus } from 'lucide-react';

const JOB_TYPES: { value: JobType; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'report', label: 'Report' },
  { value: 'sync', label: 'Sync' },
  { value: 'export', label: 'Export' },
];

interface Props {
  onSubmit: (title: string, type: JobType) => Promise<boolean>;
  disabled?: boolean;
}

export function CreateJobForm({ onSubmit, disabled }: Props) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<JobType>('email');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || submitting) return;

    setSubmitting(true);
    try {
      const ok = await onSubmit(title.trim(), type);
      if (ok) setTitle('');
    } finally {
      setSubmitting(false);
    }
  };

  const isDisabled = disabled || submitting;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-xl border bg-card p-2 transition-[border-color,box-shadow] focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/10 sm:flex-row sm:items-center"
    >
      <label className="flex min-w-0 flex-1 items-center gap-2.5 px-2">
        <Plus
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground"
        />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs processing?"
          disabled={isDisabled}
          autoComplete="off"
          className="h-10 w-full min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        />
      </label>
      <div className="flex items-center gap-1.5 px-1.5 sm:px-1">
        <Select
          value={type}
          onValueChange={(v) => setType(v as JobType)}
          disabled={isDisabled}
        >
          <SelectTrigger className="h-9 w-full border-0 bg-transparent px-2 text-sm text-muted-foreground shadow-none hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 sm:w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {JOB_TYPES.map((jt) => (
              <SelectItem key={jt.value} value={jt.value}>
                {jt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="submit"
          disabled={isDisabled || !title.trim()}
          className="h-9 flex-1 gap-1.5 sm:flex-none"
        >
          {submitting ? 'Queuing…' : 'Queue job'}
          {!submitting && <ArrowRight className="size-3.5" />}
        </Button>
      </div>
    </form>
  );
}