"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import en from "@/content/en";
import { useSession } from "@/hooks/useSession";
import { useSignedAction } from "@/hooks/useSignedAction";
import { SignedRequestError, getJson, postSigned } from "@/lib/client/signed-request";
import type { DisbursementResponse } from "@/lib/disbursements";

const t = en.disbursements;

function stellarTxUrl(hash: string) {
  const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE?.startsWith("Public")
    ? "public"
    : "testnet";
  return `https://stellar.expert/explorer/${network}/tx/${hash}`;
}

/** A beneficiary's disbursements, each redeemable into their Stellar wallet. */
export function MyDisbursementsSection() {
  const { sign } = useSignedAction();
  const { toast } = useToast();

  const [disbursements, setDisbursements] = useState<DisbursementResponse[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  // Listing uses a read-only session: one StartSession signature, then no prompts
  const session = useSession();
  const { markSignedOut } = session;

  const showError = (error: unknown) =>
    toast({
      title: en.common.error,
      description: error instanceof Error ? error.message : en.common.unknownError,
      variant: "destructive",
    });

  const fetchDisbursements = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getJson<{ disbursements: DisbursementResponse[] }>(
        "/api/disbursements/mine"
      );
      setDisbursements(data.disbursements);
    } catch (error) {
      if (error instanceof SignedRequestError && error.code === "no_session") markSignedOut();
      else showError(error);
    } finally {
      setLoading(false);
    }
    // showError only wraps the stable toast function
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markSignedOut]);

  // Load automatically once signed in (no prompt)
  useEffect(() => {
    if (session.status === "signed_in" && !disbursements) fetchDisbursements();
  }, [session.status, disbursements, fetchDisbursements]);

  async function load() {
    try {
      if (session.status !== "signed_in") await session.signIn();
      await fetchDisbursements();
    } catch (error) {
      showError(error);
    }
  }

  async function redeem(disbursement: DisbursementResponse) {
    setRedeemingId(disbursement.id);
    try {
      const signed = await sign("RedeemDisbursement", { disbursementId: disbursement.id });
      const data = await postSigned<{ disbursement: DisbursementResponse }>(
        "/api/disbursements/redeem",
        signed
      );
      setDisbursements(
        (list) => list?.map((d) => (d.id === data.disbursement.id ? data.disbursement : d)) ?? list
      );
      toast({ title: t.redeemed, description: t.redeemedDescription(disbursement.amount) });
    } catch (error) {
      showError(error);
      // The status may have changed (e.g. to needs_review); show the current state
      if (session.status === "signed_in") fetchDisbursements();
    } finally {
      setRedeemingId(null);
    }
  }

  return (
    <section className="space-y-3 mb-8">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-medium">{t.myHeading}</h2>
        <Button
          variant="outline"
          onClick={load}
          disabled={loading || session.status === "checking"}
        >
          {loading ? t.loading : disbursements ? t.refresh : t.show}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{t.myDescription}</p>

      {disbursements && disbursements.length === 0 && (
        <p className="text-sm text-muted-foreground">{t.none}</p>
      )}

      {disbursements && disbursements.length > 0 && (
        <ul className="divide-y rounded-md border">
          {disbursements.map((d) => (
            <li
              key={d.id}
              className="p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm"
            >
              <div className="space-y-0.5">
                <p className="font-mono">{d.amount} XLM</p>
                <p className="text-muted-foreground">
                  {t.status[d.status]} · {new Date(d.createdAt).toLocaleDateString()}
                </p>
              </div>
              {d.status === "pending" && (
                <Button size="sm" onClick={() => redeem(d)} disabled={redeemingId !== null}>
                  {redeemingId === d.id ? t.redeeming : t.redeem}
                </Button>
              )}
              {d.txHash && d.status === "redeemed" && (
                <a
                  href={stellarTxUrl(d.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  {t.viewTransaction}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
