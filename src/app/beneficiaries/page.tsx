"use client";

import { FormEvent, useState } from "react";

import { getAddress, isAddress } from "viem";

import { ConnectButton } from "@/components/ConnectButton";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import { InfoText } from "@/components/ui/InfoText";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import en from "@/content/en";
import { useIsWearerOfHat } from "@/hooks/useIsWearerOfHat";
import { SignedAction, useSignedAction } from "@/hooks/useSignedAction";
import type { BeneficiaryResponse } from "@/lib/beneficiaries";
import { isFresh, postSigned, shortenAddress } from "@/lib/client/signed-request";
import type { AllowanceResponse, DisbursementResponse } from "@/lib/disbursements";

const t = en.beneficiariesPage;
const XLM_AMOUNT = /^\d+(\.\d{1,7})?$/;

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
        beneficiary: getAddress(beneficiary.ethAddress),
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
    <form onSubmit={handleSubmit} className="flex items-start gap-2" noValidate>
      <div className="space-y-1">
        <Input
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setAmountError(null);
          }}
          inputMode="decimal"
          // The theme's placeholder colour matches body text; keep this one clearly empty
          placeholder={t.amountPlaceholder}
          aria-label={`${t.amountLabel}, ${beneficiary.ethAddress}`}
          aria-invalid={!!amountError}
          className="w-28 placeholder:text-gray-400"
        />
        {amountError && <p className="text-xs text-red-600">{amountError}</p>}
      </div>
      <Button type="submit" size="sm" disabled={sending} className="mt-0.5">
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
  // A ListBeneficiaries signature is read-only and reusable until it expires
  const [listSignature, setListSignature] = useState<SignedAction | null>(null);

  const showError = (error: unknown) =>
    toast({
      title: en.common.error,
      description: error instanceof Error ? error.message : en.common.unknownError,
      variant: "destructive",
    });

  async function loadOverview({ askToSign = true } = {}) {
    if (!isFresh(listSignature) && !askToSign) return;
    setLoadingList(true);
    try {
      const signed = isFresh(listSignature) ? listSignature : await sign("ListBeneficiaries", {});
      setListSignature(signed);
      setOverview(await postSigned<LeaderOverview>("/api/beneficiaries/list", signed));
    } catch (error) {
      showError(error);
    } finally {
      setLoadingList(false);
    }
  }

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    const value = beneficiaryInput.trim();
    if (!isAddress(value)) {
      setInputError(t.invalidAddress);
      return;
    }

    setAdding(true);
    try {
      const signed = await sign("AddBeneficiary", { beneficiary: getAddress(value) });
      const data = await postSigned<{ beneficiary: BeneficiaryResponse }>(
        "/api/beneficiaries",
        signed
      );
      setBeneficiaryInput("");
      toast({ title: t.added, description: data.beneficiary.ethAddress });
      // Show the new entry without asking for another signature
      setOverview((current) =>
        current
          ? { ...current, beneficiaries: [data.beneficiary, ...current.beneficiaries] }
          : current
      );
    } catch (error) {
      showError(error);
    } finally {
      setAdding(false);
    }
  }

  function handleDisbursed(disbursement: DisbursementResponse) {
    toast({ title: t.disbursed, description: t.disbursedDescription(disbursement.amount) });
    setOverview((current) =>
      current ? { ...current, disbursements: [disbursement, ...current.disbursements] } : current
    );
    // Refresh the allowance if the list signature is still valid (no new prompt)
    loadOverview({ askToSign: false });
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
          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2" noValidate>
            <div className="flex-1 space-y-1">
              <Input
                value={beneficiaryInput}
                onChange={(e) => {
                  setBeneficiaryInput(e.target.value);
                  setInputError(null);
                }}
                placeholder={t.addressPlaceholder}
                className="placeholder:text-gray-400"
                aria-label={t.ethAddress}
                aria-invalid={!!inputError}
                autoComplete="off"
                spellCheck={false}
              />
              {inputError && <p className="text-sm text-red-600">{inputError}</p>}
            </div>
            <Button type="submit" disabled={adding}>
              {adding ? t.adding : t.add}
            </Button>
          </form>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-medium">{t.listHeading}</h2>
            <Button variant="outline" onClick={() => loadOverview()} disabled={loadingList}>
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
                  <div className="space-y-0.5">
                    <p className="font-mono" title={b.ethAddress}>
                      {shortenAddress(b.ethAddress)}
                    </p>
                    <p className="font-mono text-muted-foreground" title={b.stellarAddress}>
                      {t.stellarAddress}: {shortenAddress(b.stellarAddress)}
                    </p>
                  </div>
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
                  <li key={d.id} className="p-3 grid gap-1 sm:grid-cols-3 sm:items-center text-sm">
                    <span className="font-mono" title={d.beneficiaryEthAddress}>
                      {shortenAddress(d.beneficiaryEthAddress)}
                    </span>
                    <span className="font-mono">{d.amount} XLM</span>
                    <span className="text-muted-foreground sm:text-right">
                      {statusLabel[d.status]} · {new Date(d.createdAt).toLocaleDateString()}
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
