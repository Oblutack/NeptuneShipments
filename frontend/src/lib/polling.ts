// Safety-net refetch interval for data the server now pushes over the
// WebSocket (vessel positions). The socket is the primary path; this only
// matters while it is down or reconnecting, so it can be slow.
export const FALLBACK_POLL_MS = 30_000;
