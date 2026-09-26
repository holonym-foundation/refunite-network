// @vitest-environment node
import { POST as addBeneficiaryRoute } from "@/app/api/beneficiaries/route";
import { GET as listBeneficiariesRoute } from "@/app/api/beneficiaries/list/route";
import { db } from "@/lib/db";
import { SignedActionType } from "@/lib/eip712/signed-actions";
import { isLeader } from "@/lib/relayer";
import { defaultChain } from "@/wagmi/chain-config";
import { sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { PrivateKeyAccount } from "viem/accounts";
import { accounts, sessionCookie, signedBody, stellarAccounts } from "../helpers/signed-actions";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => import("../helpers/db").then((m) => m.createTestDbModule()));

// The on-chain hat check; everything else (signatures, nonces, DB) is real
vi.mock("@/lib/relayer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/relayer")>()),
  getLeaderHatConfig: () => ({ hatsAddress: "0x0", leaderHatId: BigInt(1) }),
  isLeader: vi.fn(),
}));

const { leaderA, leaderB } = accounts;
const BENEFICIARY = stellarAccounts.beneficiary.publicKey(); // a Stellar account

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-that-is-at-least-32-chars";
  process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
});

beforeEach(async () => {
  await db.execute(
    sql`TRUNCATE beneficiaries, leader_action_nonces, security_events, audit_log CASCADE`
  );
  vi.mocked(isLeader).mockImplementation(async (_client, _config, address) =>
    [leaderA.address, leaderB.address].includes(address as `0x${string}`)
  );
});

const signed = <T extends SignedActionType>(
  signer: PrivateKeyAccount,
  primaryType: T,
  fields: Parameters<typeof signedBody<T>>[2]
) => signedBody(signer, primaryType, fields, { chainId: defaultChain.id });

const request = (body: unknown) =>
  new NextRequest("http://localhost/api", { method: "POST", body: JSON.stringify(body) });

async function call(route: (r: NextRequest) => Promise<Response>, body: unknown) {
  const res = await route(request(body));
  return { status: res.status, body: await res.json() };
}

async function list(signer: PrivateKeyAccount) {
  const res = await listBeneficiariesRoute(
    new NextRequest("http://localhost/api/beneficiaries/list", {
      headers: { cookie: await sessionCookie(signer, defaultChain.id) },
    })
  );
  return { status: res.status, body: await res.json() };
}

describe("beneficiaries API", () => {
  it("lets a leader add a beneficiary and list it, with its Stellar wallet address", async () => {
    const added = await call(
      addBeneficiaryRoute,
      await signed(leaderA, "AddBeneficiary", { beneficiary: BENEFICIARY })
    );
    expect(added.status).toBe(201);
    expect(added.body.beneficiary).toMatchObject({
      stellarAddress: BENEFICIARY,
    });

    const listed = await list(leaderA);
    expect(listed.status).toBe(200);
    expect(listed.body.beneficiaries).toEqual([added.body.beneficiary]);
  });

  it("shows each leader only the beneficiaries they added", async () => {
    await call(
      addBeneficiaryRoute,
      await signed(leaderA, "AddBeneficiary", { beneficiary: BENEFICIARY })
    );

    const listed = await list(leaderB);
    expect(listed.body.beneficiaries).toEqual([]);
  });

  it("rejects adding an address that another leader already added", async () => {
    await call(
      addBeneficiaryRoute,
      await signed(leaderA, "AddBeneficiary", { beneficiary: BENEFICIARY })
    );

    const second = await call(
      addBeneficiaryRoute,
      await signed(leaderB, "AddBeneficiary", { beneficiary: BENEFICIARY })
    );
    expect(second).toMatchObject({ status: 409, body: { code: "already_registered" } });
  });

  it("rejects an address that is not a Stellar account", async () => {
    const evm = await call(
      addBeneficiaryRoute,
      await signed(leaderA, "AddBeneficiary", { beneficiary: leaderA.address })
    );
    expect(evm.status).toBe(400);
    const badChecksum = await call(
      addBeneficiaryRoute,
      await signed(leaderA, "AddBeneficiary", { beneficiary: "G" + "A".repeat(55) })
    );
    expect(badChecksum.status).toBe(400);
  });

  it("rejects a signer who is not a leader", async () => {
    vi.mocked(isLeader).mockResolvedValue(false);
    const res = await call(
      addBeneficiaryRoute,
      await signed(leaderA, "AddBeneficiary", { beneficiary: BENEFICIARY })
    );
    expect(res).toMatchObject({ status: 403, body: { code: "not_leader" } });
  });

  it("rejects a replayed add signature", async () => {
    const body = await signed(leaderA, "AddBeneficiary", { beneficiary: BENEFICIARY });
    await call(addBeneficiaryRoute, body);

    const replay = await call(addBeneficiaryRoute, body);
    expect(replay).toMatchObject({ status: 409, body: { code: "replay" } });
  });

  it("lists without a new signature while the session lasts", async () => {
    const cookie = await sessionCookie(leaderA, defaultChain.id);
    for (let i = 0; i < 2; i++) {
      const res = await listBeneficiariesRoute(
        new NextRequest("http://localhost/api/beneficiaries/list", { headers: { cookie } })
      );
      expect(res.status).toBe(200);
    }
  });

  it("requires a session to list", async () => {
    const res = await listBeneficiariesRoute(
      new NextRequest("http://localhost/api/beneficiaries/list")
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: "no_session" });
  });

  it("rejects listing for a session whose wallet is no longer a leader", async () => {
    const cookie = await sessionCookie(leaderA, defaultChain.id);
    vi.mocked(isLeader).mockResolvedValue(false);
    const res = await listBeneficiariesRoute(
      new NextRequest("http://localhost/api/beneficiaries/list", { headers: { cookie } })
    );
    expect(res.status).toBe(403);
  });

  it("rejects a forged session cookie", async () => {
    const res = await listBeneficiariesRoute(
      new NextRequest("http://localhost/api/beneficiaries/list", {
        headers: { cookie: "relayid_session=eyJhIjoiMHgxIn0.forged" },
      })
    );
    expect(res.status).toBe(401);
  });

  it("rejects a malformed body", async () => {
    const res = await addBeneficiaryRoute(
      new NextRequest("http://localhost/api", { method: "POST", body: "not json" })
    );
    expect(res.status).toBe(400);
  });
});
