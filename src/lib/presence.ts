// Whether someone counts as online.
//
// The stored flag alone cannot be trusted: it is written by the browser, and
// a browser that is closed abruptly — a phone locking, a tab killed, a
// network drop — never gets to write "offline". The flag then stays true
// forever and the green dot lies.
//
// So online means the flag is set AND we have heard from them recently. The
// app sends a heartbeat every 30 seconds, so anything older than the window
// below means they are gone, whatever the flag says.

/** How long after the last heartbeat someone still counts as online. */
export const PRESENCE_WINDOW_MS = 75_000;

export interface PresenceRow {
  is_online?: boolean | null;
  last_seen?: string | null;
}

export function isOnline(status: PresenceRow | null | undefined): boolean {
  if (!status?.is_online || !status.last_seen) return false;
  const seen = new Date(status.last_seen).getTime();
  if (!Number.isFinite(seen)) return false;
  // A clock slightly ahead of ours should not read as stale
  return Date.now() - seen < PRESENCE_WINDOW_MS;
}

/** "Active now", or when they were last around. */
export function lastSeenLabel(status: PresenceRow | null | undefined): string {
  if (isOnline(status)) return "Active now";
  if (!status?.last_seen) return "Offline";
  const seen = new Date(status.last_seen).getTime();
  if (!Number.isFinite(seen)) return "Offline";
  const mins = Math.floor((Date.now() - seen) / 60000);
  if (mins < 1) return "Active moments ago";
  if (mins < 60) return `Active ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Active ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Active yesterday" : `Active ${days}d ago`;
}
