"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import { ConnectButton } from "@/components/ConnectButton";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import { InfoText } from "@/components/ui/InfoText";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import en from "@/content/en";
import { useIsWearerOfHat } from "@/hooks/useIsWearerOfHat";
import { useSession } from "@/hooks/useSession";
import { useSignedAction } from "@/hooks/useSignedAction";
import type { BeneficiaryResponse } from "@/lib/beneficiaries";
import {
  SignedRequestError,
  getJson,
  postSigned,
  shortenAddress,
} from "@/lib/client/signed-request";
import type { AllowanceResponse, DisbursementResponse } from "@/lib/disbursements";

const t = en.beneficiariesPage;
const XLM_AMOUNT = /^\d+(\.\d{1,7})?$/;
// Stellar account (G…); the server also verifies the checksum
const STELLAR_ACCOUNT = /^G[A-Z2-7]{55}$/;

type LeaderOverview = {
  beneficiaries: BeneficiaryResponse[];
  disbursements: DisbursementResponse[];
  allowance: AllowanceResponse;
};

function DisburseForm({
  beneficiary,
  onDisbursed,
  onError,
}: {
  beneficiary: BeneficiaryResponse;
  onDisbursed: (disbursement: DisbursementResponse) => void;
  onError: (error: unknown) => void;
}) {
  const { sign } = useSignedAction();
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    // Many phone keyboards type a comma as the decimal separator
    const value = amount.trim().replace(",", ".");
    if (!value) {
      setAmountError(t.amountRequired);
      return;
    }
    if (!XLM_AMOUNT.test(value) || Number(value) <= 0) {
      setAmountError(t.invalidAmount);
      return;
    }

    setSending(true);
    try {
      const signed = await sign("CreateDisbursement", {
        beneficiary: beneficiary.stellarAddress,
        amount: value,
      });
      const data = await postSigned<{ disbursement: DisbursementResponse }>(
        "/api/disbursements",
        signed
      );
      setAmount("");
      onDisbursed(data.disbursement);
    } catch (error) {
      onError(error);
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor={`amount-${beneficiary.id}`}>{t.amountLabel}</Label>
        <Input
          id={`amount-${beneficiary.id}`}
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setAmountError(null);
          }}
          inputMode="decimal"
          // The theme's placeholder colour matches body text; keep this one clearly empty
          placeholder={t.amountPlaceholder}
          aria-label={`${t.amountLabel}, ${beneficiary.stellarAddress}`}
          aria-invalid={!!amountError}
          className="w-32 placeholder:text-gray-400"
        />
        {amountError && <p className="text-xs text-red-600">{amountError}</p>}
      </div>
      <Button type="submit" disabled={sending} className="h-11">
        {sending ? t.disbursing : t.disburse}
      </Button>
    </form>
  );
}

export default function BeneficiariesPage() {
  const { isConnected, hasHat, isLoading: isCheckingHat } = useIsWearerOfHat();
  const { sign } = useSignedAction();
  const { toast } = useToast();

  const [beneficiaryInput, setBeneficiaryInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const [overview, setOverview] = useState<LeaderOverview | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  // Listing uses a read-only session: one StartSession signature, then no prompts
  const session = useSession();

  const showError = (error: unknown) =>
    toast({
      title: en.common.error,
      description: error instanceof Error ? error.message : en.common.unknownError,
      variant: "destructive",
    });

  const { markSignedOut } = session;
  const fetchOverview = useCallback(async () => {
    setLoadingList(true);
    try {
      setOverview(await getJson<LeaderOverview>("/api/beneficiaries/list"));
    } catch (error) {
      if (error instanceof SignedRequestError && error.code === "no_session") markSignedOut();
      else showError(error);
    } finally {
      setLoadingList(false);
    }
    // showError only wraps the stable toast function
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markSignedOut]);

  // Load automatically once signed in (no prompt)
  useEffect(() => {
    if (hasHat && session.status === "signed_in" && !overview) fetchOverview();
  }, [hasHat, session.status, overview, fetchOverview]);

  async function showList() {
    try {
      if (session.status !== "signed_in") await session.signIn();
      await fetchOverview();
    } catch (error) {
      showError(error);
    }
  }

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    const value = beneficiaryInput.trim();
    if (!STELLAR_ACCOUNT.test(value)) {
      setInputError(t.invalidAddress);
      return;
    }

    setAdding(true);
    try {
      const signed = await sign("AddBeneficiary", { beneficiary: value });
      const data = await postSigned<{ beneficiary: BeneficiaryResponse }>(
        "/api/beneficiaries",
        signed
      );
      setBeneficiaryInput("");
      toast({ title: t.added, description: data.beneficiary.stellarAddress });
      if (session.status === "signed_in") fetchOverview();
    } catch (error) {
      showError(error);
    } finally {
      setAdding(false);
    }
  }

  const [cancellingId, setCancellingId] = useState<string | null>(null);

  async function handleCancel(disbursement: DisbursementResponse) {
    setCancellingId(disbursement.id);
    try {
      const signed = await sign("CancelDisbursement", { disbursementId: disbursement.id });
      await postSigned("/api/disbursements/cancel", signed);
      toast({
        title: en.disbursements.cancelled,
        description: en.disbursements.cancelledDescription(disbursement.amount),
      });
      fetchOverview();
    } catch (error) {
      showError(error);
    } finally {
      setCancellingId(null);
    }
  }

  function handleDisbursed(disbursement: DisbursementResponse) {
    toast({ title: t.disbursed, description: t.disbursedDescription(disbursement.amount) });
    // Refresh the list and allowance (the session makes this prompt-free)
    if (session.status === "signed_in") fetchOverview();
  }

  if (!isConnected) {
    return (
      <Container>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
          <InfoText
            heading={t.title}
            message={t.loginPrompt}
            variant="info"
            className="text-center"
          />
          <ConnectButton />
        </div>
      </Container>
    );
  }

  if (isCheckingHat || hasHat === null) {
    return (
      <Container>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <InfoText
            heading={t.title}
            message={t.checkingLeader}
            variant="progress"
            className="text-center"
          />
        </div>
      </Container>
    );
  }

  if (!hasHat) {
    return (
      <Container>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <InfoText
            heading={en.common.notAllowed}
            message={t.notLeader}
            variant="warning"
            className="text-center"
          />
        </div>
      </Container>
    );
  }

  const statusLabel = en.disbursements.status;

  return (
    <Container>
      <h1 className="text-2xl font-semibold mb-8">{t.title}</h1>

      <div className="space-y-10">
        <section className="space-y-3">
          <h2 className="text-lg font-medium">{t.addHeading}</h2>
          <p className="text-sm text-muted-foreground">{t.addDescription}</p>
          <form
            onSubmit={handleAdd}
            className="flex flex-col sm:flex-row sm:items-end gap-2"
            noValidate
          >
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="beneficiary-address">{t.stellarAddress}</Label>
              <Input
                id="beneficiary-address"
                value={beneficiaryInput}
                onChange={(e) => {
                  setBeneficiaryInput(e.target.value);
                  setInputError(null);
                }}
                placeholder={t.addressPlaceholder}
                className="placeholder:text-gray-400"
                aria-invalid={!!inputError}
                autoComplete="off"
                spellCheck={false}
              />
              {inputError && <p className="text-sm text-red-600">{inputError}</p>}
            </div>
            <Button type="submit" disabled={adding} className="h-11">
              {adding ? t.adding : t.add}
            </Button>
          </form>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-medium">{t.listHeading}</h2>
            <Button
              variant="outline"
              onClick={showList}
              disabled={loadingList || session.status === "checking"}
            >
              {loadingList ? t.loadingList : overview ? t.refresh : t.show}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">{t.listDescription}</p>

          {overview && (
            <div className="rounded-md border p-4 text-sm space-y-1">
              <p className="font-medium">{t.allowanceHeading}</p>
              <p>
                {t.allowanceBalance}:{" "}
                <span className="font-mono">{overview.allowance.balance} XLM</span>
                {" · "}
                {t.allowanceToday}:{" "}
                <span className="font-mono">{overview.allowance.usedLast24h} XLM</span>
              </p>
              <p className="text-muted-foreground">
                {t.allowanceLimits(
                  overview.allowance.maxPerDisbursement,
                  overview.allowance.maxPerLeaderPerDay
                )}
              </p>
            </div>
          )}

          {overview && overview.beneficiaries.length === 0 && (
            <p className="text-sm text-muted-foreground">{t.empty}</p>
          )}

          {overview && overview.beneficiaries.length > 0 && (
            <ul className="divide-y rounded-md border">
              {overview.beneficiaries.map((b) => (
                <li
                  key={b.id}
                  className="p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm"
                >
                  <p className="font-mono" title={b.stellarAddress}>
                    {shortenAddress(b.stellarAddress)}
                  </p>
                  <DisburseForm beneficiary={b} onDisbursed={handleDisbursed} onError={showError} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {overview && (
          <section className="space-y-3">
            <h2 className="text-lg font-medium">{t.recentHeading}</h2>
            {overview.disbursements.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.noDisbursements}</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {overview.disbursements.map((d) => (
                  <li key={d.id} className="p-3 grid gap-1 sm:grid-cols-4 sm:items-center text-sm">
                    <span className="font-mono" title={d.beneficiary}>
                      {shortenAddress(d.beneficiary)}
                    </span>
                    <span className="font-mono">{d.amount} XLM</span>
                    <span className="text-muted-foreground">
                      {statusLabel[d.status]} · {new Date(d.createdAt).toLocaleDateString()}
                    </span>
                    <span className="sm:text-right">
                      {d.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancel(d)}
                          disabled={cancellingId !== null}
                        >
                          {cancellingId === d.id
                            ? en.disbursements.cancelling
                            : en.disbursements.cancel}
                        </Button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </Container>
  );
}
