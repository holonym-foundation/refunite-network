import { createHmac, timingSafeEqual } from "crypto";
import { Address, getAddress, isAddress } from "viem";

/**
 * Read-only sessions. A wallet signs StartSession once; the server then sets an HttpOnly
 * cookie proving the address for SESSION_TTL_SECONDS, so listing beneficiaries or
 * disbursements needs no further signatures.
 *
 * A session only identifies the address. Roles (leader hat, registered beneficiary) are
 * checked on every request, and anything that changes state still needs its own signature.
 *
 * Token: base64url(JSON {a: address, e: expiry}) + "." + base64url(HMAC-SHA256(SESSION_SECRET)).
 */
export const SESSION_COOKIE = "relayid_session";
export const SESSION_TTL_SECONDS = 24 * 60 * 60;

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

export function createSessionToken(address: Address, nowMs = Date.now()) {
  const expiresAt = Math.floor(nowMs / 1000) + SESSION_TTL_SECONDS;
  const payload = Buffer.from(JSON.stringify({ a: address, e: expiresAt })).toString("base64url");
  return { token: `${payload}.${sign(payload)}`, expiresAt };
}

/** The session's address, or null if the token is missing, forged or expired. */
export function readSessionToken(
  token: string | undefined,
  nowMs = Date.now()
): { address: Address; expiresAt: number } | null {
  if (!token) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;

  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const { a, e } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof a !== "string" || !isAddress(a) || typeof e !== "number") return null;
    if (e <= Math.floor(nowMs / 1000)) return null;
    return { address: getAddress(a), expiresAt: e };
  } catch {
    return null;
  }
}

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

/** The signed-in address for a request, or null. */
export function getSessionAddress(request: {
  cookies: { get(name: string): { value: string } | undefined };
}) {
  return readSessionToken(request.cookies.get(SESSION_COOKIE)?.value)?.address ?? null;
}
