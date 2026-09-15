import { useState } from 'react';
import type { JobType } from '../types/job';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
      <Input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Job title"
        disabled={disabled || submitting}
        className="flex-1"
        required
      />
      <Select
        value={type}
        onValueChange={(v) => setType(v as JobType)}
        disabled={disabled || submitting}
      >
        <SelectTrigger className="w-full sm:w-32">
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
        disabled={disabled || submitting || !title.trim()}
        className="w-full sm:w-auto"
      >
        {submitting ? 'Creating…' : 'Create job'}
      </Button>
    </form>
  );
}