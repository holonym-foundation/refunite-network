import type { SignedAction } from "@/hooks/useSignedAction";

export class SignedRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string
  ) {
    super(message);
    this.name = "SignedRequestError";
  }
}

/** POSTs a signed action as `{ message, signature }` and returns the JSON response. */
export async function postSigned<T>(url: string, signed: SignedAction): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: signed.message, signature: signed.signature }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new SignedRequestError(
      data.error ?? `Request failed (${res.status})`,
      res.status,
      data.code
    );
  }
  return data as T;
}

/** GETs JSON with the session cookie; throws SignedRequestError (e.g. code "no_session"). */
export async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new SignedRequestError(
      data.error ?? `Request failed (${res.status})`,
      res.status,
      data.code
    );
  }
  return data as T;
}

export const shortenAddress = (value: string) => `${value.slice(0, 6)}…${value.slice(-4)}`;
