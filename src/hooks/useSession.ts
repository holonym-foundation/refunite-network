import { postSigned } from "@/lib/client/signed-request";
import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useSignedAction } from "./useSignedAction";

export type SessionStatus = "checking" | "signed_in" | "signed_out";

/**
 * Read-only session for the connected wallet (see src/lib/session.ts). `signIn` asks for one
 * StartSession signature; afterwards lists load without prompts until the session expires.
 * A session for a different address than the connected one counts as signed out.
 */
export function useSession() {
  const { address } = useAccount();
  const { sign } = useSignedAction();
  const [status, setStatus] = useState<SessionStatus>("checking");

  useEffect(() => {
    if (!address) {
      setStatus("signed_out");
      return;
    }
    let cancelled = false;
    setStatus("checking");
    fetch("/api/session", { credentials: "same-origin", cache: "no-store" })
      .then(async (res) => (res.ok ? ((await res.json()) as { address: string }) : null))
      .catch(() => null)
      .then((session) => {
        if (!cancelled) setStatus(session?.address === address ? "signed_in" : "signed_out");
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  const signIn = useCallback(async () => {
    await postSigned("/api/session", await sign("StartSession", {}));
    setStatus("signed_in");
  }, [sign]);

  /** Call when the server reports no_session (e.g. the cookie expired). */
  const markSignedOut = useCallback(() => setStatus("signed_out"), []);

  return { status, signIn, markSignedOut };
}

/** Ends the session (call on logout). */
export async function endSession() {
  await fetch("/api/session", { method: "DELETE", credentials: "same-origin" }).catch(() => {});
}
