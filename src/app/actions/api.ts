"use server";

import { Hash, TypedDataDefinition } from "viem";
import { DeviceInfo } from "@/lib/database/types";

/**
 * Server-side helper to make authenticated API calls
 * This keeps the API token secure on the server
 */
async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const apiToken = process.env.RELAYID_APP_API_TOKEN;

  if (!apiToken) {
    throw new Error("API token not configured");
  }

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${apiToken}`,
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Server action to verify an invite code
 */
export async function verifyInviteCode(code: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return authenticatedFetch(`${baseUrl}/api/invites/verify`, {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

/**
 * Server action to process invite flow onboarding
 */
export async function processInviteOnboarding(params: {
  recipient: string;
  typedData: any;
  signature: Hash;
  deviceInfo?: Partial<DeviceInfo>;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return authenticatedFetch(`${baseUrl}/api/onboarding/invite`, {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/**
 * Server action to process direct flow onboarding
 */
export async function processDirectOnboarding(params: {
  recipient: string;
  typedData: any;
  signature: Hash;
  deviceInfo?: Partial<DeviceInfo>;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return authenticatedFetch(`${baseUrl}/api/onboarding/direct`, {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/**
 * Server action to create an invite
 */
export async function createInvite(params: {
  inviterAddress: string;
  signature: string;
  nonce: string;
  typedData: any;
  deviceInfo?: Partial<DeviceInfo>;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return authenticatedFetch(`${baseUrl}/api/invites`, {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/**
 * Server action to submit feedback
 */
export async function submitFeedback(params: {
  sentiment: string | null;
  feedback: string;
  user: string;
  page: string;
  deviceInfo: any;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return authenticatedFetch(`${baseUrl}/api/messages/feedback`, {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/**
 * Server action to fetch metrics
 * Note: /api/health doesn't need auth, so we use regular fetch for it
 */
export async function fetchMetrics() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return authenticatedFetch(`${baseUrl}/api/metrics`, {
    method: "GET",
  });
}
