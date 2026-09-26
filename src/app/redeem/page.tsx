"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import { useToast } from "@/components/ui/use-toast";
import en from "@/content/en";
import { useStellarSignedAction } from "@/hooks/useStellarSignedAction";
import { connectFreighter } from "@/lib/client/freighter";
import {
  SignedRequestError,
  getJson,
  postSigned,
  shortenAddress,
} from "@/lib/client/signed-request";
import type { DisbursementResponse } from "@/lib/disbursements";

const t = en.disbursements;

function stellarTxUrl(hash: string) {
  const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE?.startsWith("Public")
    ? "public"
    : "testnet";
  return `https://stellar.expert/explorer/${network}/tx/${hash}`;
}

/**
 * Beneficiaries are Stellar accounts: they connect Freighter, sign in once (a Stellar
 * session), and redeem each disbursement with a Stellar signature.
 */
export default function RedeemPage() {
  const { toast } = useToast();
  const [account, setAccount] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [disbursements, setDisbursements] = useState<DisbursementResponse[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const { sign } = useStellarSignedAction(account);

  const showError = useCallback(
    (error: unknown) =>
      toast({
        title: en.common.error,
        description: error instanceof Error ? error.message : en.common.unknownError,
        variant: "destructive",
      }),
    [toast]
  );

  // A session for the connected account means the list loads without a prompt
  useEffect(() => {
    if (!account) return;
    fetch("/api/session/stellar", { credentials: "same-origin", cache: "no-store" })
      .then(async (res) => (res.ok ? ((await res.json()) as { address: string }) : null))
      .catch(() => null)
      .then((session) => setSignedIn(session?.address === account));
  }, [account]);

  const fetchDisbursements = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getJson<{ disbursements: DisbursementResponse[] }>(
        "/api/disbursements/mine"
      );
      setDisbursements(data.disbursements);
    } catch (error) {
      if (error instanceof SignedRequestError && error.code === "no_session") setSignedIn(false);
      else showError(error);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    if (signedIn && !disbursements) fetchDisbursements();
  }, [signedIn, disbursements, fetchDisbursements]);

  async function connect() {
    setConnecting(true);
    try {
      setAccount(await connectFreighter());
      setDisbursements(null);
    } catch (error) {
      showError(error);
    } finally {
      setConnecting(false);
    }
  }

  async function disconnect() {
    await fetch("/api/session/stellar", { method: "DELETE", credentials: "same-origin" }).catch(
      () => {}
    );
    setAccount(null);
    setSignedIn(false);
    setDisbursements(null);
  }

  async function show() {
    try {
      if (!signedIn) {
        await postSigned("/api/session/stellar", await sign("StartStellarSession", {}));
        setSignedIn(true);
      }
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
      if (signedIn) fetchDisbursements();
    } finally {
      setRedeemingId(null);
    }
  }

  return (
    <Container>
      <h1 className="text-2xl font-semibold mb-4">{t.redeemTitle}</h1>
      <p className="text-sm mb-8">{t.redeemIntro}</p>

      {!account ? (
        <Button onClick={connect} disabled={connecting}>
          {connecting ? t.connecting : t.connect}
        </Button>
      ) : (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm">
            <span>
              {t.connectedAs}:{" "}
              <span className="font-mono" title={account}>
                {shortenAddress(account)}
              </span>
            </span>
            <Button variant="outline" size="sm" onClick={disconnect}>
              {t.disconnect}
            </Button>
          </div>

          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-medium">{t.myHeading}</h2>
            <Button variant="outline" onClick={show} disabled={loading}>
              {loading ? t.loading : disbursements ? t.refresh : t.show}
            </Button>
          </div>
          {!signedIn && <p className="text-sm">{t.signInHint}</p>}

          {disbursements && disbursements.length === 0 && <p className="text-sm">{t.none}</p>}

          {disbursements && disbursements.length > 0 && (
            <ul className="divide-y rounded-md border">
              {disbursements.map((d) => (
                <li
                  key={d.id}
                  className="p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm"
                >
                  <div className="space-y-0.5">
                    <p className="font-mono">{d.amount} XLM</p>
                    <p>
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
      )}
    </Container>
  );
}
