// @vitest-environment node
import { POST as addBeneficiaryRoute } from "@/app/api/beneficiaries/route";
import { POST as listBeneficiariesRoute } from "@/app/api/beneficiaries/list/route";
import { db } from "@/lib/db";
import { generateNonce } from "@/lib/eip712";
import {
  LeaderActionMessage,
  LeaderActionType,
  createLeaderActionTypedData,
} from "@/lib/eip712/leader-actions";
import { isLeader } from "@/lib/relayer";
import { defaultChain } from "@/wagmi/chain-config";
import { sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { PrivateKeyAccount, privateKeyToAccount } from "viem/accounts";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const schema = await import("@/lib/db/schema");
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  return { db };
});

// The on-chain hat check; everything else (signatures, nonces, DB) is real
vi.mock("@/lib/relayer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/relayer")>()),
  getLeaderHatConfig: () => ({ hatsAddress: "0x0", leaderHatId: BigInt(1) }),
  isLeader: vi.fn(),
}));

// Anvil test keys
const leaderA = privateKeyToAccount(
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
);
const leaderB = privateKeyToAccount(
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
);
const BENEFICIARY = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";

beforeAll(() => {
  process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
  process.env.NEXT_PUBLIC_STELLAR_ECDSA_SECP256K1_FACTORY_CONTRACT_ID =
    "CDJOTVVKNPEQP577P2GSYBPFVEY3JPJ7QJ3T2YWPMTI3TWIKNPTDO7Z2";
  process.env.WALLET_SALT = "0102030405060708090a0b0c";
});

beforeEach(async () => {
  await db.execute(sql`TRUNCATE beneficiaries, leader_action_nonces, security_events, audit_log`);
  vi.mocked(isLeader).mockImplementation(async (_client, _config, address) =>
    [leaderA.address, leaderB.address].includes(address as `0x${string}`)
  );
});

async function signed<T extends LeaderActionType>(
  signer: PrivateKeyAccount,
  primaryType: T,
  fields: Omit<LeaderActionMessage<T>, "leader" | "nonce" | "issuedAt">
) {
  const message = {
    ...fields,
    leader: signer.address,
    nonce: generateNonce(),
    issuedAt: BigInt(Math.floor(Date.now() / 1000)),
  } as LeaderActionMessage<T>;
  const signature = await signer.signTypedData(
    createLeaderActionTypedData(primaryType, message, defaultChain.id) as never
  );
  return { message: { ...message, issuedAt: message.issuedAt.toString() }, signature };
}

const request = (body: unknown) =>
  new NextRequest("http://localhost/api", { method: "POST", body: JSON.stringify(body) });

async function call(route: (r: NextRequest) => Promise<Response>, body: unknown) {
  const res = await route(request(body));
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
      ethAddress: BENEFICIARY,
      stellarAddress: "CC3ARJ4BI6Q2IW7J27YC3K7VHC7O25PZZ74OGFL7RKG5THHEMVJVN7CY",
    });

    const listed = await call(
      listBeneficiariesRoute,
      await signed(leaderA, "ListBeneficiaries", {})
    );
    expect(listed.status).toBe(200);
    expect(listed.body.beneficiaries).toEqual([added.body.beneficiary]);
  });

  it("shows each leader only the beneficiaries they added", async () => {
    await call(
      addBeneficiaryRoute,
      await signed(leaderA, "AddBeneficiary", { beneficiary: BENEFICIARY })
    );

    const listed = await call(
      listBeneficiariesRoute,
      await signed(leaderB, "ListBeneficiaries", {})
    );
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

  it("rejects a leader adding themselves", async () => {
    const res = await call(
      addBeneficiaryRoute,
      await signed(leaderA, "AddBeneficiary", { beneficiary: leaderA.address })
    );
    expect(res.status).toBe(400);
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

  it("accepts the same list signature more than once while it is fresh", async () => {
    const body = await signed(leaderA, "ListBeneficiaries", {});
    expect((await call(listBeneficiariesRoute, body)).status).toBe(200);
    expect((await call(listBeneficiariesRoute, body)).status).toBe(200);
  });

  it("rejects a malformed body", async () => {
    const res = await addBeneficiaryRoute(
      new NextRequest("http://localhost/api", { method: "POST", body: "not json" })
    );
    expect(res.status).toBe(400);
  });
});
