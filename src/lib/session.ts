import { createHmac, timingSafeEqual } from "crypto";
import { Address, getAddress, isAddress } from "viem";

/**
 * Read-only sessions. A wallet signs once (StartSession with WaaP, or StartStellarSession
 * with a Stellar key); the server then sets an HttpOnly cookie proving the address for
 * SESSION_TTL_SECONDS, so listing beneficiaries or disbursements needs no further signatures.
 *
 * A session only identifies the address. Roles (leader hat, registered beneficiary) are
 * checked on every request, and anything that changes state still needs its own signature.
 *
 * Two kinds, each in its own cookie so a leader and a beneficiary session can coexist:
 * "evm" (an Ethereum address) and "stellar" (a Stellar account).
 *
 * Token: base64url(JSON {a: subject, e: expiry, k: kind}) + "." +
 *        base64url(HMAC-SHA256(SESSION_SECRET)).
 */
export type SessionKind = "evm" | "stellar";

export const SESSION_COOKIE = "relayid_session";
export const STELLAR_SESSION_COOKIE = "relayid_stellar_session";
export const SESSION_TTL_SECONDS = 24 * 60 * 60;

const COOKIE_FOR: Record<SessionKind, string> = {
  evm: SESSION_COOKIE,
  stellar: STELLAR_SESSION_COOKIE,
};

export class SessionConfigError extends Error {
  constructor() {
    super("SESSION_SECRET must be set to at least 32 characters");
    this.name = "SessionConfigError";
  }
}

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new SessionConfigError();
  return value;
}

const sign = (payload: string) =>
  createHmac("sha256", secret()).update(payload).digest("base64url");

const validSubject: Record<SessionKind, (value: string) => boolean> = {
  evm: (value) => isAddress(value),
  stellar: (value) => /^G[A-Z2-7]{55}$/.test(value),
};

export function createSessionToken(subject: string, nowMs = Date.now(), kind: SessionKind = "evm") {
  const expiresAt = Math.floor(nowMs / 1000) + SESSION_TTL_SECONDS;
  const payload = Buffer.from(JSON.stringify({ a: subject, e: expiresAt, k: kind })).toString(
    "base64url"
  );
  return { token: `${payload}.${sign(payload)}`, expiresAt };
}

/** The session's subject, or null if the token is missing, forged, expired or another kind. */
export function readSessionToken(
  token: string | undefined,
  nowMs = Date.now(),
  kind: SessionKind = "evm"
): { address: string; expiresAt: number } | null {
  if (!token) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;

  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const { a, e, k = "evm" } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (k !== kind || typeof a !== "string" || !validSubject[kind](a) || typeof e !== "number") {
      return null;
    }
    if (e <= Math.floor(nowMs / 1000)) return null;
    return { address: kind === "evm" ? getAddress(a) : a, expiresAt: e };
  } catch {
    return null;
  }
}

export const sessionCookieName = (kind: SessionKind) => COOKIE_FOR[kind];

/** Cookie attributes; `path: "/api"` keeps it off page requests. */
export function sessionCookieOptions(maxAge = SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/api",
    maxAge,
  };
}

type RequestWithCookies = { cookies: { get(name: string): { value: string } | undefined } };

/** The signed-in Ethereum address for a request, or null. */
export function getSessionAddress(request: RequestWithCookies): Address | null {
  const session = readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  return (session?.address as Address | undefined) ?? null;
}

/** The signed-in Stellar account for a request, or null. */
export function getStellarSessionAccount(request: RequestWithCookies): string | null {
  return (
    readSessionToken(request.cookies.get(STELLAR_SESSION_COOKIE)?.value, Date.now(), "stellar")
      ?.address ?? null
  );
}
