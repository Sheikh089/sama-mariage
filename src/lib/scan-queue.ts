import { get, set } from "idb-keyval";

const KEY = "sama_scan_queue_v1";

export type QueuedScan = {
  id: string;
  token: string;
  scanned_at: string;
  session_token: string | null;
};

export async function getQueue(): Promise<QueuedScan[]> {
  return (await get<QueuedScan[]>(KEY)) ?? [];
}

export async function enqueue(item: QueuedScan): Promise<void> {
  const q = await getQueue();
  q.push(item);
  await set(KEY, q);
}

export async function clearItem(id: string): Promise<void> {
  const q = await getQueue();
  await set(KEY, q.filter((x) => x.id !== id));
}

export async function setQueue(q: QueuedScan[]): Promise<void> {
  await set(KEY, q);
}
