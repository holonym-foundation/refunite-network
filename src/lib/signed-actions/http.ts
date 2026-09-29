import { DisbursementError } from "@/lib/disbursements";
import { SessionConfigError } from "@/lib/session";
import { StellarConfigError } from "@/lib/stellar/address";
import { NextResponse } from "next/server";
import { SignedActionError } from ".";

/** JSON error response for a route that handles a signed action. */
export function signedActionErrorResponse(error: unknown, context: string) {
  if (error instanceof SignedActionError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof DisbursementError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof SessionConfigError) {
    console.error(`${context}: ${error.message}`);
    return NextResponse.json({ error: "Sessions are not configured" }, { status: 500 });
  }
  if (error instanceof StellarConfigError) {
    console.error(`${context}: Stellar is not configured`, error);
    return NextResponse.json({ error: "Stellar wallets are not configured" }, { status: 500 });
  }
  console.error(`${context}:`, error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

/** Reads `{ message, signature }` from a JSON request body. */
export async function readSignedBody(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    throw new SignedActionError(
      "invalid_request",
      "Expected a JSON body with message and signature"
    );
  }
  return {
    message: (body as { message?: unknown }).message,
    signature: (body as { signature?: unknown }).signature,
  };
}
