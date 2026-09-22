// @vitest-environment node
import { DB } from "@/lib/database/service";
import { db } from "@/lib/db";
import { unmarshalTypedData } from "@/lib/utils/serialize";
import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Real Postgres (PGlite, in memory) with the generated migrations applied
vi.mock("@/lib/db", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const schema = await import("@/lib/db/schema");
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  return { db };
});

const INVITER = "0x3333333333333333333333333333333333333333";
const RECIPIENT = "0x1111111111111111111111111111111111111111";
const inFuture = (seconds: number) => new Date(Date.now() + seconds * 1000).toISOString();

function invitation(overrides: Partial<Parameters<typeof DB.createInvitation>[0]> = {}) {
  return DB.createInvitation({
    invite_code: "code-1",
    flow_type: "invite",
    inviter_address: INVITER,
    recipient_address: null,
    signature: "0xsig",
    typed_data: { message: { nonce: "n1", createdAt: BigInt(1700000000) } },
    nonce: "n1",
    expires_at: inFuture(3600),
    ...overrides,
  });
}

beforeEach(async () => {
  await db.execute(
    sql`TRUNCATE invitations, reservations, completions, security_events, audit_log, leader_action_nonces RESTART IDENTITY CASCADE`
  );
});

describe("invitations", () => {
  it("creates and finds an invitation by code and by inviter + nonce", async () => {
    const created = await invitation();

    expect(created).toMatchObject({ id: 1, invite_code: "code-1", flow_type: "invite" });
    expect(typeof created.created_at).toBe("string");
    expect(await DB.findInvitation({ invite_code: "code-1" })).toMatchObject({ id: 1 });
    expect(
      await DB.findInvitation({
        inviter_address_and_nonce: { inviter_address: INVITER, nonce: "n1" },
      })
    ).toMatchObject({ id: 1 });
    expect(await DB.findInvitation({ invite_code: "missing" })).toBeNull();
  });

  it("round-trips typed data including BigInt values", async () => {
    await invitation();
    const found = await DB.findInvitation({ id: 1 });

    expect(unmarshalTypedData(found!.typed_data).message.createdAt).toBe(BigInt(1700000000));
  });

  it("rejects a reused inviter + nonce (replay protection)", async () => {
    await invitation();
    await expect(invitation({ invite_code: "code-2" })).rejects.toThrow();
  });

  it("rejects a direct onboarding that has an invite code", async () => {
    await expect(invitation({ flow_type: "direct" })).rejects.toThrow();
  });
});

describe("reservations and status", () => {
  it("moves an invitation from pending to reserved to completed", async () => {
    await invitation();
    expect((await DB.getInvitationStatus(1))!.status).toBe("pending");

    await DB.createReservation({
      invitation_id: 1,
      reservation_id: "res-1",
      recipient_address: RECIPIENT,
      expires_at: inFuture(60),
    });
    expect((await DB.getInvitationStatus(1))!.status).toBe("reserved");
    expect(await DB.findActiveReservation("res-1")).toMatchObject({ recipient_address: RECIPIENT });

    await DB.createCompletion({
      invitation_id: 1,
      reservation_id: "res-1",
      recipient_address: RECIPIENT,
      mint_hat_tx_hash: "0xmint",
      claim_signer_tx_hash: "0xclaim",
    });
    await DB.releaseReservation("res-1", "completed");

    const status = await DB.getInvitationStatus(1);
    expect(status).toMatchObject({ status: "completed", mint_hat_tx_hash: "0xmint" });
    expect(await DB.findActiveReservation("res-1")).toBeNull();
    expect(await DB.isAddressOnboarded(RECIPIENT.toUpperCase().replace("0X", "0x"))).toBe(true);
  });

  it("reports an expired invitation", async () => {
    await invitation({ expires_at: inFuture(-60) });
    expect((await DB.getInvitationStatus(1))!.status).toBe("expired");
  });

  it("cleans up a reservation that expired earlier today", async () => {
    await invitation();
    await DB.createReservation({
      invitation_id: 1,
      reservation_id: "res-1",
      recipient_address: RECIPIENT,
      expires_at: inFuture(-5),
    });

    expect(await DB.getExpiredItems()).toEqual(
      expect.arrayContaining([expect.objectContaining({ item_type: "reservation", item_id: 1 })])
    );
    expect(await DB.cleanupExpiredReservations()).toBe(1);
    expect(await DB.countReservedInvites()).toBe(0);
  });
});

describe("security events and audit log", () => {
  it("accepts recipient_mismatch events", async () => {
    await DB.logSecurityEventWithDeviceInfo(
      {
        event_type: "recipient_mismatch",
        inviter_address: INVITER,
        recipient_address: RECIPIENT,
        signature: null,
        nonce: null,
        ip_address: null,
        user_agent: null,
        metadata: { note: "test" },
      },
      { browser: "test" }
    );

    const { rows } = await db.execute(sql`SELECT event_type, metadata FROM security_events`);
    expect(rows).toEqual([
      {
        event_type: "recipient_mismatch",
        metadata: { note: "test", deviceInfo: { browser: "test" } },
      },
    ]);
  });

  it("writes audit entries", async () => {
    await DB.logAudit({
      entity_type: "reservation",
      entity_id: 0,
      action: "expire",
      actor_address: null,
      metadata: { cleaned_count: 1 },
    });

    const { rows } = await db.execute(sql`SELECT action FROM audit_log`);
    expect(rows).toEqual([{ action: "expire" }]);
  });
});

describe("leader action nonces", () => {
  it("accepts a nonce once per leader", async () => {
    expect(await DB.consumeLeaderActionNonce(INVITER, "nonce-1", "AddBeneficiary")).toBe(true);
    expect(await DB.consumeLeaderActionNonce(INVITER, "nonce-1", "AddBeneficiary")).toBe(false);
    // Nonces are scoped per leader
    expect(await DB.consumeLeaderActionNonce(RECIPIENT, "nonce-1", "AddBeneficiary")).toBe(true);
  });
});

describe("dashboard counts", () => {
  it("counts invitations, completions and reservations", async () => {
    await invitation();
    await invitation({ invite_code: "code-2", nonce: "n2", recipient_address: RECIPIENT });

    expect(await DB.countInvitations()).toBe(2);
    expect(await DB.countCompletions()).toBe(1);
    expect(await DB.countReservedInvites()).toBe(0);
  });
});
