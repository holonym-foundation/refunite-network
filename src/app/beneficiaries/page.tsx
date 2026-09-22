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
import { SignedLeaderAction, useLeaderAction } from "@/hooks/useLeaderAction";
import type { BeneficiaryResponse } from "@/lib/beneficiaries";
import { MAX_SIGNATURE_AGE_SECONDS } from "@/lib/leader-auth/constants";

const t = en.beneficiariesPage;

async function postSigned<T>(url: string, signed: SignedLeaderAction): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: signed.message, signature: signed.signature }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

const shorten = (value: string) => `${value.slice(0, 6)}…${value.slice(-4)}`;

export default function BeneficiariesPage() {
  const { isConnected, hasHat, isLoading: isCheckingHat } = useIsWearerOfHat();
  const { sign } = useLeaderAction();
  const { toast } = useToast();

  const [beneficiaryInput, setBeneficiaryInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryResponse[] | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  // A ListBeneficiaries signature is read-only and reusable until it expires
  const [listSignature, setListSignature] = useState<SignedLeaderAction | null>(null);

  const showError = (error: unknown) =>
    toast({
      title: en.common.error,
      description: error instanceof Error ? error.message : en.common.unknownError,
      variant: "destructive",
    });

  async function loadBeneficiaries() {
    setLoadingList(true);
    try {
      const reusable =
        listSignature &&
        Date.now() / 1000 - listSignature.issuedAt < MAX_SIGNATURE_AGE_SECONDS - 30;
      const signed = reusable ? listSignature : await sign("ListBeneficiaries", {});
      setListSignature(signed);

      const data = await postSigned<{ beneficiaries: BeneficiaryResponse[] }>(
        "/api/beneficiaries/list",
        signed
      );
      setBeneficiaries(data.beneficiaries);
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
      setBeneficiaries((list) => (list ? [data.beneficiary, ...list] : list));
    } catch (error) {
      showError(error);
    } finally {
      setAdding(false);
    }
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
                aria-label={en.beneficiariesPage.ethAddress}
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
            <Button variant="outline" onClick={loadBeneficiaries} disabled={loadingList}>
              {loadingList ? t.loadingList : beneficiaries ? t.refresh : t.show}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">{t.listDescription}</p>

          {beneficiaries && beneficiaries.length === 0 && (
            <p className="text-sm text-muted-foreground">{t.empty}</p>
          )}

          {beneficiaries && beneficiaries.length > 0 && (
            <ul className="divide-y rounded-md border">
              {beneficiaries.map((b) => (
                <li key={b.id} className="p-3 grid gap-1 sm:grid-cols-3 sm:items-center text-sm">
                  <span className="font-mono" title={b.ethAddress}>
                    {shorten(b.ethAddress)}
                  </span>
                  <span className="font-mono text-muted-foreground" title={b.stellarAddress}>
                    {t.stellarAddress}: {shorten(b.stellarAddress)}
                  </span>
                  <span className="text-muted-foreground sm:text-right">
                    {t.addedOn} {new Date(b.createdAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Container>
  );
}
