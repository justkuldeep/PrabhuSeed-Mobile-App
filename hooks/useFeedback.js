import { useState, useCallback, useRef, useEffect } from 'react';
import { feedbackAPI } from '../services/api';
import { enqueue, syncQueue, getQueueCount, saveDraft, loadDraft, clearDraft } from '../services/offlineQueue';

/**
 * Hook for fetching activity attributes and managing form state.
 * Handles online/offline submit with queue fallback.
 */
export function useActivityAttributes(activityTypeId) {
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!activityTypeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await feedbackAPI.getAttributes(activityTypeId);
      const seen = new Set();
      const unique = (res.data || []).filter((a) => {
        if (seen.has(a.field_key)) return false;
        seen.add(a.field_key);
        return true;
      });
      setAttributes(unique);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activityTypeId]);

  return { attributes, loading, error, refetch: fetch };
}

/**
 * Hook for submitting feedback with offline-first support.
 */
export function useFeedbackSubmit() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const submit = useCallback(async (payload, { onSuccess, onQueued, onError } = {}) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await feedbackAPI.submit(payload);
      await clearDraft(payload.activity_type_id);
      onSuccess?.(res.data);
      return { ok: true, data: res.data, queued: false };
    } catch (err) {
      // Network/timeout error → queue for later
      const isOffline = err.message?.includes('network') ||
        err.message?.includes('timeout') ||
        err.message?.includes('reach server') ||
        err.message?.includes('ECONNABORTED');

      if (isOffline) {
        const queueId = await enqueue({ ...payload, local_id: `local_${Date.now()}` });
        await clearDraft(payload.activity_type_id);
        onQueued?.({ queueId });
        return { ok: true, queued: true, queueId };
      }

      setError(err.message);
      onError?.(err);
      return { ok: false, error: err.message };
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submit, submitting, error };
}

/**
 * Hook for listing past submissions.
 */
export function useSubmissions(activityTypeId) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = activityTypeId ? { activity_type_id: activityTypeId } : {};
      const res = await feedbackAPI.listSubmissions(params);
      setSubmissions(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activityTypeId]);

  return { submissions, loading, error, refetch: fetch };
}

/**
 * Hook for offline queue status and sync trigger.
 */
export function useOfflineQueue() {
  const [queueCount, setQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const refreshCount = useCallback(async () => {
    try {
      const count = await getQueueCount();
      setQueueCount(count);
    } catch {
      // AsyncStorage unavailable — leave count at 0
    }
  }, []);

  useEffect(() => {
    refreshCount().catch(() => {});
  }, [refreshCount]);

  const sync = useCallback(async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncQueue();
      setSyncResult(result);
      await refreshCount();
    } finally {
      setSyncing(false);
    }
  }, [refreshCount]);

  return { queueCount, syncing, syncResult, refreshCount, sync };
}

/**
 * Hook for auto-saving form drafts to AsyncStorage.
 */
export function useDraft(activityTypeId) {
  const timerRef = useRef(null);

  const autosave = useCallback((values) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      saveDraft(activityTypeId, values).catch(() => {});
    }, 1500);
  }, [activityTypeId]);

  const restoreDraft = useCallback(async () => {
    return loadDraft(activityTypeId);
  }, [activityTypeId]);

  return { autosave, restoreDraft };
}
