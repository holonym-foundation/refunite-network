import {
  SESSION_COOKIE,
  SessionConfigError,
  createSessionToken,
  getSessionAddress,
  readSessionToken,
  sessionCookieOptions,
} from "@/lib/session";
import { verifySignedAction } from "@/lib/signed-actions";
import { readSignedBody, signedActionErrorResponse } from "@/lib/signed-actions/http";
import { NextRequest, NextResponse } from "next/server";

/** The current session: { address, expiresAt }, or 401. */
export async function GET(request: NextRequest) {
  try {
    const session = readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
    if (!session) return NextResponse.json({ error: "No session" }, { status: 401 });
    return NextResponse.json(session);
  } catch (error) {
    return signedActionErrorResponse(error, "GET /api/session");
  }
}

/** Start a session. Body: { message: StartSession, signature } signed by the wallet. */
export async function POST(request: NextRequest) {
  try {
    const { message, signature } = await readSignedBody(request);
    const { signer } = await verifySignedAction({
      primaryType: "StartSession",
      message,
      signature,
    });

    const { token, expiresAt } = createSessionToken(signer);
    const response = NextResponse.json({ address: signer, expiresAt });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof SessionConfigError) {
      console.error("POST /api/session:", error.message);
      return NextResponse.json({ error: "Sessions are not configured" }, { status: 500 });
    }
    return signedActionErrorResponse(error, "POST /api/session");
  }
}

/** End the session (on logout). */
export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ ended: getSessionAddress(request) !== null });
  response.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
  return response;
}
