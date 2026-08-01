import { useCallback, useEffect, useRef, useState } from 'react';
import { getToken } from '../lib/auth';
import { apiOrigin, getAIJob } from '../lib/ai-studio/api';
import type { AIGenerationJob } from '../lib/ai-studio/types';

const terminalStatuses = new Set(['completed', 'failed', 'cancelled', 'awaiting_review']);

export function useAIJob(onSettled?: (job: AIGenerationJob) => void | Promise<void>) {
  const [job, setJob] = useState<AIGenerationJob | null>(null);
  const [connected, setConnected] = useState(false);
  const settledRef = useRef<string>('');
  const callbackRef = useRef(onSettled);
  callbackRef.current = onSettled;

  const accept = useCallback((next: AIGenerationJob | null) => {
    if (!next) return;
    setJob(next);
    if (terminalStatuses.has(next.status) && settledRef.current !== `${next.id}:${next.status}`) {
      settledRef.current = `${next.id}:${next.status}`;
      void callbackRef.current?.(next);
    }
  }, []);

  const watch = useCallback((next: AIGenerationJob) => {
    settledRef.current = '';
    setJob(next);
  }, []);

  const clear = useCallback(() => {
    setJob(null);
    settledRef.current = '';
  }, []);

  useEffect(() => {
    if (!job?.id || terminalStatuses.has(job.status)) return;
    let stopped = false;
    let source: EventSource | null = null;
    let poll: number | null = null;

    const startPolling = () => {
      if (poll !== null) return;
      const tick = async () => {
        try {
          const latest = await getAIJob(job.id);
          if (!stopped) accept(latest);
        } catch {
          // Transient network failures are retried on the next interval.
        }
      };
      void tick();
      poll = window.setInterval(tick, 1800);
    };

    try {
      const token = getToken();
      const url = new URL(`${apiOrigin()}/api/ai/jobs/${encodeURIComponent(job.id)}/events`);
      if (token) url.searchParams.set('token', token);
      source = new EventSource(url.toString());
      source.onopen = () => setConnected(true);
      source.onmessage = (event) => {
        try { accept(JSON.parse(event.data) as AIGenerationJob); } catch { /* ignore malformed event */ }
      };
      source.addEventListener('job', (event) => {
        try { accept(JSON.parse((event as MessageEvent).data) as AIGenerationJob); } catch { /* ignore malformed event */ }
      });
      source.onerror = () => {
        setConnected(false);
        source?.close();
        source = null;
        startPolling();
      };
    } catch {
      startPolling();
    }

    return () => {
      stopped = true;
      setConnected(false);
      source?.close();
      if (poll !== null) window.clearInterval(poll);
    };
  }, [accept, job?.id, job?.status]);

  return { job, watch, clear, connected, setJob: accept };
}
