// The WebSocket lives on the same host as the REST API, so derive its URL
// from the API base URL instead of hardcoding a second host that would have
// to be kept in sync (it used to be ws://localhost:8080, which broke anywhere
// but local dev).
//
// A browser's native WebSocket can't set an Authorization header, so the
// token goes in the query string - the server's /ws/fleet middleware reads it
// from there.
export function fleetSocketUrl(apiBaseUrl: string, token: string | null): string {
  const url = new URL(apiBaseUrl, window.location.href);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws/fleet";
  url.search = `?token=${encodeURIComponent(token ?? "")}`;
  url.hash = "";
  return url.toString();
}
