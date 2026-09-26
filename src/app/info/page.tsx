"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHAIN_ID, HATS_TREE_ID } from "@/lib/constants";
import { defaultChain } from "@/wagmi/chain-config";
import { useEffect, useState } from "react";

type Failed = { error: string };
const failed = (value: unknown): value is Failed =>
  typeof value === "object" && value !== null && "error" in value;

type TreasuryInfo = {
  address: string;
  balance: string;
  outstanding: string;
  free: string;
  low: boolean;
  disbursements: Record<string, number>;
};

interface MetricsData {
  completions: number | Failed;
  reservedInvites: number | Failed;
  invitations: number | Failed;
  hatsWearers: number | Failed;
  relayerBalance: string | Failed;
  relayerAddress?: string;
  relayerExplorerUrl?: string;
  treasury: TreasuryInfo | Failed;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Waiting to be redeemed",
  redeeming: "Being paid",
  redeemed: "Paid",
  needs_review: "Being checked",
  cancelled: "Cancelled",
};

function stellarAccountUrl(address: string) {
  const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE?.startsWith("Public")
    ? "public"
    : "testnet";
  return `https://stellar.expert/explorer/${network}/account/${address}`;
}

function Value({ value }: { value: number | string | Failed | undefined }) {
  if (value === undefined) return <span className="font-mono">–</span>;
  if (failed(value)) return <span className="text-red-600">unavailable</span>;
  return <span className="text-green-600 font-mono">{value}</span>;
}

function useMetrics() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/metrics", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load metrics (${res.status})`);
        return res.json();
      })
      .then(setMetrics)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load metrics"));
  }, []);

  return { metrics, error };
}

function Network({ metrics }: { metrics: MetricsData }) {
  const relayerBalance = failed(metrics.relayerBalance)
    ? metrics.relayerBalance
    : `${(Number(metrics.relayerBalance) / 1e18).toFixed(4)} ${defaultChain.nativeCurrency.symbol}`;

  return (
    <ul className="list-disc pl-5 space-y-1">
      <li>
        Leaders (hat wearers): <Value value={metrics.hatsWearers} />
      </li>
      <li>
        Successful onboardings: <Value value={metrics.completions} />
      </li>
      <li>
        Reserved invites: <Value value={metrics.reservedInvites} />
      </li>
      <li>
        Total invites: <Value value={metrics.invitations} />
      </li>
      <li>
        Onboarding relayer balance: <Value value={relayerBalance} />
      </li>
      {metrics.relayerAddress && (
        <li>
          Onboarding relayer:{" "}
          <a
            href={metrics.relayerExplorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono underline break-all"
          >
            {metrics.relayerAddress}
          </a>
        </li>
      )}
    </ul>
  );
}

function Treasury({ treasury }: { treasury: MetricsData["treasury"] }) {
  if (failed(treasury)) return <p className="text-red-600">Treasury information unavailable</p>;

  return (
    <div className="space-y-3">
      {treasury.low && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900">
          The treasury is running low: only {treasury.free} XLM is free after unpaid disbursements.
          Top it up to keep disbursements working.
        </p>
      )}
      <ul className="list-disc pl-5 space-y-1">
        <li>
          Balance: <Value value={`${treasury.balance} XLM`} />
        </li>
        <li>
          Promised, not yet paid: <Value value={`${treasury.outstanding} XLM`} />
        </li>
        <li>
          Free for new disbursements: <Value value={`${treasury.free} XLM`} />
        </li>
        <li>
          Account:{" "}
          <a
            href={stellarAccountUrl(treasury.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono underline break-all"
          >
            {treasury.address}
          </a>
        </li>
      </ul>
      <p className="font-medium">Disbursements</p>
      <ul className="list-disc pl-5 space-y-1">
        {Object.entries(treasury.disbursements).map(([status, count]) => (
          <li key={status}>
            {STATUS_LABELS[status] ?? status}: <Value value={count} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function HealthStatus() {
  const [status, setStatus] = useState("Loading...");

  useEffect(() => {
    fetch("/api/health", { cache: "no-store" })
      .then(async (res) =>
        setStatus(res.ok && (await res.json()).status === "ok" ? "Healthy" : "Unhealthy")
      )
      .catch(() => setStatus("Unhealthy"));
  }, []);

  return (
    <span className={`font-mono ${status === "Healthy" ? "text-green-600" : "text-red-600"}`}>
      Status: {status}
    </span>
  );
}

const hatsTreeLink = () => `https://app.hatsprotocol.xyz/trees/${CHAIN_ID}/${HATS_TREE_ID}`;

/** Public network information: aggregate numbers and on-chain addresses only. */
export default function InfoPage() {
  const { metrics, error } = useMetrics();

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
      <h1 className="text-3xl font-bold mb-6">Network info</h1>

      <Card>
        <CardHeader>
          <CardTitle>API health</CardTitle>
        </CardHeader>
        <CardContent>
          <HealthStatus />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Links</CardTitle>
        </CardHeader>
        <CardContent className="space-x-4">
          <Button asChild variant="outline">
            <a href={hatsTreeLink()} target="_blank" rel="noopener noreferrer">
              Hats tree
            </a>
          </Button>
        </CardContent>
      </Card>

      {error && <p className="text-red-600">{error}</p>}
      {!metrics && !error && <p>Loading…</p>}

      {metrics && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Network</CardTitle>
            </CardHeader>
            <CardContent>
              <Network metrics={metrics} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stellar treasury</CardTitle>
            </CardHeader>
            <CardContent>
              <Treasury treasury={metrics.treasury} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
