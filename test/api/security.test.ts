// @vitest-environment node
import { createInvite } from "@/app/actions/invite";
import { POST as feedbackRoute } from "@/app/api/messages/feedback/route";
import { GET as cleanupRoute } from "@/app/api/system/cleanup/route";
import { POST as deleteRoute } from "@/app/api/users/delete/route";
import { createNetworkInviteTypedData, generateNonce } from "@/lib/eip712";
import { isLeader } from "@/lib/relayer";
import { buildFeedbackMessage, sendFeedbackMessage } from "@/lib/slack/webhook";
import { defaultChain } from "@/wagmi/chain-config";
import { NextRequest } from "next/server";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { accounts, sessionCookie } from "../helpers/signed-actions";

vi.mock("@/lib/db", () => import("../helpers/db").then((m) => m.createTestDbModule()));
vi.mock("@/lib/relayer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/relayer")>()),
  getLeaderHatConfig: () => ({ hatsAddress: "0x0", leaderHatId: BigInt(1) }),
  isLeader: vi.fn(),
}));
vi.mock("@/lib/slack/webhook", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/slack/webhook")>()),
  sendFeedbackMessage: vi.fn(async () => {}),
  sendInviteCreatedMessage: vi.fn(async () => {}),
}));
// Stellar is not configured in tests: the cron skips reconciling
vi.mock("@/lib/stellar/network", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/stellar/network")>()),
  stellarPaymentOps: () => {
    throw new Error("not configured");
  },
}));

const { leaderA, beneficiary } = accounts;
const post = (body: unknown, headers: Record<string, string> = {}) =>
  new NextRequest("http://localhost/api", { method: "POST", body: JSON.stringify(body), headers });

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-that-is-at-least-32-chars";
});
beforeEach(() => {
  vi.clearAllMocks();
});

describe("cron: /api/system/cleanup", () => {
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });
  const get = (headers: Record<string, string>) =>
    cleanupRoute(new NextRequest("http://localhost/api/system/cleanup", { headers }));

  it("refuses to run when CRON_SECRET is not configured", async () => {
    expect((await get({ authorization: "Bearer anything" })).status).toBe(503);
  });

  it("rejects a spoofed Vercel user agent and a wrong secret", async () => {
    process.env.CRON_SECRET = "cron-secret";
    expect((await get({ "user-agent": "vercel-cron/1.0" })).status).toBe(401);
    expect((await get({ authorization: "Bearer wrong" })).status).toBe(401);
  });

  it("runs with the right secret", async () => {
    process.env.CRON_SECRET = "cron-secret";
    const res = await get({ authorization: "Bearer cron-secret" });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, cleanedCount: 0, disbursements: null });
  });
});

describe("POST /api/users/delete", () => {
  const body = (address: string) => ({ address, confirmationPhrase: "delete me" });

  it("needs a session", async () => {
    expect((await deleteRoute(post(body(beneficiary.address)))).status).toBe(401);
  });

  it("only accepts a request for the signed-in address", async () => {
    const cookie = await sessionCookie(beneficiary, defaultChain.id);
    expect((await deleteRoute(post(body(leaderA.address), { cookie }))).status).toBe(403);
    expect((await deleteRoute(post(body(beneficiary.address), { cookie }))).status).toBe(200);
  });
});

describe("POST /api/messages/feedback", () => {
  const valid = { sentiment: "up", feedback: "Nice", page: "/", deviceInfo: {} };

  it("rejects invalid or oversized feedback", async () => {
    expect((await feedbackRoute(post({ ...valid, sentiment: "meh" }))).status).toBe(400);
    expect((await feedbackRoute(post({ ...valid, feedback: "x".repeat(2001) }))).status).toBe(400);
    expect(sendFeedbackMessage).not.toHaveBeenCalled();
  });

  it("takes the user from the session, not from the request", async () => {
    await feedbackRoute(post({ ...valid, user: leaderA.address }));
    expect(sendFeedbackMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ user: "anonymous" })
    );

    const cookie = await sessionCookie(beneficiary, defaultChain.id);
    await feedbackRoute(post({ ...valid, user: leaderA.address }, { cookie }));
    expect(sendFeedbackMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ user: beneficiary.address })
    );
  });

  it("escapes Slack formatting so feedback cannot mention channels or add links", () => {
    const message = JSON.stringify(
      buildFeedbackMessage({
        sentiment: "down",
        feedback: "<!channel> see <https://evil.example|here> & more",
        user: "anonymous",
        page: "/",
      })
    );
    expect(message).not.toContain("<!channel>");
    expect(message).toContain("&lt;!channel&gt;");
    expect(message).toContain("&amp; more");
  });
});

describe("createInvite", () => {
  it("only lets current leaders create invite links", async () => {
    const typedData = createNetworkInviteTypedData({
      inviterAddress: leaderA.address,
      nonce: generateNonce(),
      chainId: defaultChain.id,
    });
    const signature = await leaderA.signTypedData(typedData as never);

    vi.mocked(isLeader).mockResolvedValue(false);
    expect(
      await createInvite(leaderA.address, signature, typedData.message.nonce as string, typedData)
    ).toMatchObject({ success: false, error: "Only current leaders can create invite links" });

    vi.mocked(isLeader).mockResolvedValue(true);
    expect(
      await createInvite(leaderA.address, signature, typedData.message.nonce as string, typedData)
    ).toMatchObject({ success: true });
  });
});
