import {
  STELLAR_SESSION_COOKIE,
  SessionConfigError,
  createSessionToken,
  readSessionToken,
  sessionCookieOptions,
} from "@/lib/session";
import { verifyStellarAction } from "@/lib/signed-actions";
import { readSignedBody, signedActionErrorResponse } from "@/lib/signed-actions/http";
import { NextRequest, NextResponse } from "next/server";

/** The current Stellar session: { address, expiresAt }, or 401. */
export async function GET(request: NextRequest) {
  try {
    const session = readSessionToken(
      request.cookies.get(STELLAR_SESSION_COOKIE)?.value,
      Date.now(),
      "stellar"
    );
    if (!session) return NextResponse.json({ error: "No session" }, { status: 401 });
    return NextResponse.json(session);
  } catch (error) {
    return signedActionErrorResponse(error, "GET /api/session/stellar");
  }
}

/** Start a Stellar session. Body: { message: StartStellarSession, signature } (SEP-53). */
export async function POST(request: NextRequest) {
  try {
    const { message, signature } = await readSignedBody(request);
    const { signer } = await verifyStellarAction({
      primaryType: "StartStellarSession",
      message,
      signature,
    });

    const { token, expiresAt } = createSessionToken(signer, Date.now(), "stellar");
    const response = NextResponse.json({ address: signer, expiresAt });
    response.cookies.set(STELLAR_SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof SessionConfigError) {
      console.error("POST /api/session/stellar:", error.message);
      return NextResponse.json({ error: "Sessions are not configured" }, { status: 500 });
    }
    return signedActionErrorResponse(error, "POST /api/session/stellar");
  }
}

/** End the Stellar session. */
export async function DELETE() {
  const response = NextResponse.json({ ended: true });
  response.cookies.set(STELLAR_SESSION_COOKIE, "", sessionCookieOptions(0));
  return response;
}
