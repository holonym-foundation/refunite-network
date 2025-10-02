"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchMetrics } from "@/app/actions/api";
import { CHAIN_ID, HATS_TREE_ID, RELAYER_CONTRACT_ADDRESS } from "@/lib/constants";
import { useEffect, useState } from "react";

interface MetricsData {
  completions: number;
  reservedInvites: number;
  invitations: number;
  relayerBalance: string;
  hatsWearers: number;
}

function Metrics() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMetrics() {
      try {
        setLoading(true);
        const data = await fetchMetrics();
        setMetrics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch metrics");
      } finally {
        setLoading(false);
      }
    }

    loadMetrics();
  }, []);

  if (loading) {
    return (
      <ul className="list-disc pl-5 space-y-1">
        <li>Loading metrics...</li>
      </ul>
    );
  }

  if (error) {
    return (
      <ul className="list-disc pl-5 space-y-1">
        <li className="text-red-600">Error: {error}</li>
      </ul>
    );
  }

  if (!metrics) {
    return (
      <ul className="list-disc pl-5 space-y-1">
        <li>No metrics data available</li>
      </ul>
    );
  }

  // Format relayer balance (wei to CELO)
  const relayerBalanceCelo = (Number(metrics.relayerBalance) / 1e18).toFixed(4);

  return (
    <ul className="list-disc pl-5 space-y-1">
      <li>
        Successful onboardings:{" "}
        <span className="text-green-600 font-mono">{metrics.completions}</span>
      </li>
      <li>
        Reserved invites:{" "}
        <span className="text-green-600 font-mono">{metrics.reservedInvites}</span>
      </li>
      <li>
        Total invites: <span className="text-green-600 font-mono">{metrics.invitations}</span>
      </li>
      <li>
        Total Hats wearers: <span className="text-green-600 font-mono">{metrics.hatsWearers}</span>
      </li>
      <li>
        Relayer contract balance:{" "}
        <span className="text-green-600 font-mono">{relayerBalanceCelo} CELO</span>
      </li>
    </ul>
  );
}

function HealthStatus() {
  const [status, setStatus] = useState("Loading...");

  useEffect(() => {
    async function fetchHealth() {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setStatus(data.status === "ok" ? "Healthy" : "Unhealthy");
        } else {
          setStatus("Unhealthy");
        }
      } catch {
        setStatus("Unhealthy");
      }
    }

    fetchHealth();
  }, []);

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
          <HealthStatus />
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
          <Metrics />
        </CardContent>
      </Card>
    </div>
  );
}
