import { get, set } from "idb-keyval";

const KEY = "sama_scan_queue_v1";
const LOG_KEY = "sama_scan_synced_v1";

export type QueuedScan = {
  id: string;
  token: string;
  scanned_at: string;
  session_token: string | null;
};

export type SyncedScan = {
  id: string;
  token: string;
  scanned_at: string;
  synced_at: string;
  status: "ok" | "duplicate" | "already" | "error";
  guest_name?: string;
  event_title?: string;
  companions?: number;
  error?: string;
};

export async function getQueue(): Promise<QueuedScan[]> {
  return (await get<QueuedScan[]>(KEY)) ?? [];
}
export async function setQueue(q: QueuedScan[]): Promise<void> { await set(KEY, q); }

export async function enqueue(item: QueuedScan): Promise<void> {
  const q = await getQueue();
  // local dedup: same token within last 60s → skip
  const sixty = Date.now() - 60_000;
  const exists = q.find(
    (x) => x.token === item.token && new Date(x.scanned_at).getTime() > sixty,
  );
  if (exists) return;
  q.push(item);
  await set(KEY, q);
}

export async function clearItem(id: string): Promise<void> {
  const q = await getQueue();
  await set(KEY, q.filter((x) => x.id !== id));
}

export async function getSyncedLog(): Promise<SyncedScan[]> {
  return (await get<SyncedScan[]>(LOG_KEY)) ?? [];
}
export async function appendSyncedLog(item: SyncedScan): Promise<void> {
  const log = await getSyncedLog();
  log.unshift(item);
  await set(LOG_KEY, log.slice(0, 100)); // keep last 100
}
export async function clearSyncedLog(): Promise<void> { await set(LOG_KEY, []); }
