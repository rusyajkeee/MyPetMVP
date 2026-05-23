import { readJson, writeJson } from './storage';

const NOTIF_KEY = 'mypet.notifications';
const MAX_STORED = 50;

export async function pushNotification(type, title, body, data = {}) {
  const existing = (await readJson(NOTIF_KEY)) || [];
  const next = [
    {
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      title,
      body,
      data,
      readAt: null,
      createdAt: new Date().toISOString(),
    },
    ...existing,
  ].slice(0, MAX_STORED);
  await writeJson(NOTIF_KEY, next);
}

export async function listNotifications() {
  return (await readJson(NOTIF_KEY)) || [];
}

export async function markAllRead() {
  const existing = (await readJson(NOTIF_KEY)) || [];
  const nowIso = new Date().toISOString();
  await writeJson(NOTIF_KEY, existing.map((n) => ({ ...n, readAt: n.readAt || nowIso })));
}

export async function getUnreadCount() {
  const list = (await readJson(NOTIF_KEY)) || [];
  return list.filter((n) => !n.readAt).length;
}

export async function clearNotifications() {
  await writeJson(NOTIF_KEY, []);
}
