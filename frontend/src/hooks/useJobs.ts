import { useState, useEffect, useCallback } from 'react';
import type { Job, JobCounts, JobStatus } from '../types/job';
import { api } from '../api';

const PAGE_SIZE = 10;

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [counts, setCounts] = useState<JobCounts>({
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [filter, setFilter] = useState<JobStatus | undefined>(undefined);

  const selectFilter = (status: JobStatus | undefined) => {
    setPage(1);
    setFilter(status);
  };

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [jobsData, countsData] = await Promise.all([
        api.getJobs({ status: filter, page, pageSize: PAGE_SIZE }),
        api.getJobCounts(),
      ]);
      setJobs(jobsData.data);
      setCounts(countsData);
      setTotal(jobsData.meta.total);
      setTotalPages(jobsData.meta.totalPages);

      // If the current page is now empty (e.g. last item on the page was
      // deleted), step back one page so the user is never on a blank page.
      if (jobsData.data.length === 0 && page > 1) {
        setPage((p) => p - 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const runAction = async (action: () => Promise<void>): Promise<boolean> => {
    setActionError(null);
    try {
      await action();
      await fetchJobs();
      return true;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'An error occurred');
      // Refresh state even on error: e.g. after a 409 the other tab may have
      // changed the job, so the optimistic list we cached is now stale.
      try {
        await fetchJobs();
      } catch {
        // The fetch above surfaces its own error through `error`; nothing to do.
      }
      return false;
    }
  };

  const createJob = (title: string, type: Job['type']) =>
    runAction(async () => {
      await api.createJob(title, type);
    });

  const updateStatus = (id: string, status: JobStatus) =>
    runAction(async () => {
      await api.updateJobStatus(id, status);
    });

  const deleteJob = (id: string) =>
    runAction(async () => {
      await api.deleteJob(id);
    });

  return {
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
    refresh: fetchJobs,
  };
}