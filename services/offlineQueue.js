/**
 * Offline queue for farmer feedback submissions.
 * Queued items are stored in AsyncStorage and synced when connectivity returns.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { feedbackAPI } from './api';

const QUEUE_KEY = 'feedback_offline_queue';
const DRAFT_PREFIX = 'feedback_draft_';

// ─── Draft management ─────────────────────────────────────────────────────────

export async function saveDraft(activityTypeId, values) {
  const key = `${DRAFT_PREFIX}${activityTypeId}`;
  await AsyncStorage.setItem(key, JSON.stringify({ activityTypeId, values, savedAt: Date.now() }));
}

export async function loadDraft(activityTypeId) {
  const key = `${DRAFT_PREFIX}${activityTypeId}`;
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    await AsyncStorage.removeItem(key); // clear corrupted draft
    return null;
  }
}

export async function clearDraft(activityTypeId) {
  const key = `${DRAFT_PREFIX}${activityTypeId}`;
  await AsyncStorage.removeItem(key);
}

// ─── Queue management ─────────────────────────────────────────────────────────

export async function enqueue(payload) {
  const queue = await getQueue();
  const item = {
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    payload,
    queuedAt: Date.now(),
    attempts: 0,
  };
  queue.push(item);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return item.id;
}

export async function getQueue() {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function removeFromQueue(itemId) {
  const queue = await getQueue();
  const updated = queue.filter((item) => item.id !== itemId);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
}

export async function getQueueCount() {
  const queue = await getQueue();
  return queue.length;
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

/**
 * Attempt to sync all queued items.
 * Returns { synced, failed } counts.
 */
export async function syncQueue(onProgress) {
  const queue = await getQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      await feedbackAPI.submit(item.payload);
      await removeFromQueue(item.id);
      synced++;
      onProgress?.({ synced, failed, total: queue.length });
    } catch (err) {
      failed++;
      // Update attempt count
      const q = await getQueue();
      const updated = q.map((i) =>
        i.id === item.id ? { ...i, attempts: i.attempts + 1, lastError: err.message } : i
      );
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
    }
  }

  return { synced, failed };
}
