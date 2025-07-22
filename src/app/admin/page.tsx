import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHAIN_ID, HATS_TREE_ID, RELAYER_CONTRACT_ADDRESS } from "@/lib/constants";
import { Suspense } from "react";
import {
  getCompletionsCount,
  getHatsWearersCount,
  getInvitationsCount,
  getRelayerBalance,
  getReservedInvitesCount,
} from "../actions/dashboard";

async function Metrics() {
  // Fetch all metrics in parallel
  const [completions, reserved, invites, relayerBalance, hatsWearers] = await Promise.all([
    getCompletionsCount(),
    getReservedInvitesCount(),
    getInvitationsCount(),
    getRelayerBalance(),
    getHatsWearersCount(),
  ]);

  // Format relayer balance (wei to CELO)
  const relayerBalanceCelo = (Number(relayerBalance) / 1e18).toFixed(4);

  return (
    <ul className="list-disc pl-5 space-y-1">
      <li>
        Successful onboardings: <span className="text-green-600 font-mono">{completions}</span>
      </li>
      <li>
        Reserved invites: <span className="text-green-600 font-mono">{reserved}</span>
      </li>
      <li>
        Total invites: <span className="text-green-600 font-mono">{invites}</span>
      </li>
      <li>
        Total Hats wearers: <span className="text-green-600 font-mono">{hatsWearers}</span>
      </li>
      <li>
        Relayer contract balance:{" "}
        <span className="text-green-600 font-mono">{relayerBalanceCelo} CELO</span>
      </li>
    </ul>
  );
}

async function HealthStatus() {
  // Fetch /api/health
  let status = "Loading...";
  try {
    const res = await fetch("/api/health", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      status = data.status === "ok" ? "Healthy" : "Unhealthy";
    } else {
      status = "Unhealthy";
    }
  } catch {
    status = "Unhealthy";
  }
  return (
    <span className={`font-mono ${status === "Healthy" ? "text-green-600" : "text-red-600"}`}>
      Status: {status}
    </span>
  );
}

const buildHatsTreeLink = () => {
  // https://app.hatsprotocol.xyz/trees/42220/22?hatId=22.1.1
  return `https://app.hatsprotocol.xyz/trees/${CHAIN_ID}/${HATS_TREE_ID}`;
};

const buildDefenderRelayerContractLink = () => {
  return `https://celoscan.io/address/${RELAYER_CONTRACT_ADDRESS}`;
};

export default function AdminDashboard() {
  return (
    <div className="max-w-3xl mx-auto py-10 space-y-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {/* API Health Check */}
      <Card>
        <CardHeader>
          <CardTitle>API Health</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense
            fallback={<span className="font-mono text-yellow-500">Status: Loading...</span>}
          >
            {/* @ts-expect-error Async Server Component */}
            <HealthStatus />
          </Suspense>
        </CardContent>
      </Card>

      {/* Links */}
      <Card>
        <CardHeader>
          <CardTitle>Links</CardTitle>
        </CardHeader>
        <CardContent className="space-x-4">
          <Button asChild variant="outline">
            <a href={buildHatsTreeLink()} target="_blank" rel="noopener noreferrer">
              Hats Tree
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={buildDefenderRelayerContractLink()} target="_blank" rel="noopener noreferrer">
              Defender Relayer Contract
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense
            fallback={
              <ul className="list-disc pl-5 space-y-1">
                <li>Loading metrics...</li>
              </ul>
            }
          >
            {/* @ts-expect-error Async Server Component */}
            <Metrics />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
