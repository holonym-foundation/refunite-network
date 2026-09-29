import type { SignedAction } from "@/hooks/useSignedAction";
import { MAX_SIGNATURE_AGE_SECONDS } from "@/lib/signed-actions/constants";

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

/** Whether a read-only signature can be reused (with a margin before the server rejects it). */
export function isFresh(signed: SignedAction | null): signed is SignedAction {
  return !!signed && Date.now() / 1000 - signed.issuedAt < MAX_SIGNATURE_AGE_SECONDS - 30;
}

export const shortenAddress = (value: string) => `${value.slice(0, 6)}…${value.slice(-4)}`;
