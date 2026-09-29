// @vitest-environment node
import {
  SESSION_TTL_SECONDS,
  SessionConfigError,
  createSessionToken,
  readSessionToken,
} from "@/lib/session";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const ADDRESS = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
const NOW = 1_800_000_000_000;

describe("session tokens", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = "test-secret-that-is-at-least-32-chars";
  });
  afterEach(() => {
    delete process.env.SESSION_SECRET;
  });

  it("round-trips the address until it expires", () => {
    const { token, expiresAt } = createSessionToken(ADDRESS, NOW);
    expect(expiresAt).toBe(NOW / 1000 + SESSION_TTL_SECONDS);
    expect(readSessionToken(token, NOW)).toEqual({ address: ADDRESS, expiresAt });
    expect(readSessionToken(token, (expiresAt - 1) * 1000)).not.toBeNull();
    expect(readSessionToken(token, expiresAt * 1000)).toBeNull();
  });

  it("rejects a token whose payload was changed", () => {
    const { token } = createSessionToken(ADDRESS, NOW);
    const [, signature] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ a: "0x1111111111111111111111111111111111111111", e: NOW / 1000 + 99 })
    ).toString("base64url");
    expect(readSessionToken(`${forged}.${signature}`, NOW)).toBeNull();
  });

  it("rejects a token signed with another secret", () => {
    const { token } = createSessionToken(ADDRESS, NOW);
    process.env.SESSION_SECRET = "a-different-secret-of-32-characters!";
    expect(readSessionToken(token, NOW)).toBeNull();
  });

  it.each([undefined, "", "abc", "a.b.c", "not-base64.sig"])("rejects %s", (token) => {
    expect(readSessionToken(token, NOW)).toBeNull();
  });

  it("requires a SESSION_SECRET of at least 32 characters", () => {
    process.env.SESSION_SECRET = "short";
    expect(() => createSessionToken(ADDRESS, NOW)).toThrow(SessionConfigError);
  });
});
