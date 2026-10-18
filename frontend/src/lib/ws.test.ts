import { describe, it, expect } from "vitest";
import { fleetSocketUrl } from "./ws";

describe("fleetSocketUrl", () => {
  it("turns the API base URL into the matching ws:// URL, dropping the API path", () => {
    expect(fleetSocketUrl("http://localhost:8080/api", "tok")).toBe(
      "ws://localhost:8080/ws/fleet?token=tok",
    );
  });

  it("uses wss:// when the API is served over https", () => {
    expect(fleetSocketUrl("https://api.example.com/api/v2", "tok")).toBe(
      "wss://api.example.com/ws/fleet?token=tok",
    );
  });

  it("keeps a non-default port", () => {
    expect(fleetSocketUrl("http://10.0.0.5:9000/api", "t")).toBe(
      "ws://10.0.0.5:9000/ws/fleet?token=t",
    );
  });

  it("resolves a relative API base against the page's own origin", () => {
    const host = new URL(window.location.href).host;
    expect(fleetSocketUrl("/api", "tok")).toBe(`ws://${host}/ws/fleet?token=tok`);
  });

  it("URL-encodes the token, and tolerates a missing one", () => {
    expect(fleetSocketUrl("http://h/api", "a b+c/d")).toBe(
      "ws://h/ws/fleet?token=a%20b%2Bc%2Fd",
    );
    expect(fleetSocketUrl("http://h/api", null)).toBe("ws://h/ws/fleet?token=");
  });
});
