import { addLeaderViaSignedTypedData } from "@/app/actions/onboard";
import * as reservations from "@/lib/onboarding/reservations";
import * as relayer from "@/lib/relayer";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/onboarding/reservations", () => ({
  createDirectReservation: vi.fn(),
  reserveInvite: vi.fn(),
  confirmReservation: vi.fn(),
  rollbackReservation: vi.fn(),
}));

vi.mock("@/lib/slack/webhook", () => ({
  sendOnboardingSuccessMessage: vi.fn(),
  sendOnboardingFailedMessage: vi.fn(),
}));

vi.mock("@/lib/relayer", () => ({
  getRelayerClients: vi.fn(),
  getRelayerConfig: vi.fn(),
  isLeader: vi.fn(),
  onboardLeader: vi.fn(),
}));

const recipient = "0x1111111111111111111111111111111111111111";
const inviter = "0x3333333333333333333333333333333333333333";
const signature = `0x${"cc".repeat(65)}` as const;
const typedData = {
  domain: { name: "RelayID", version: "1", chainId: 11155111 },
  primaryType: "NetworkInvite",
  types: {},
  message: { inviterAddress: inviter, nonce: "n1" },
} as any;
const mintHatTxHash = `0x${"aa".repeat(32)}`;
const claimSignerTxHash = `0x${"bb".repeat(32)}`;

describe("addLeaderViaSignedTypedData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(relayer.getRelayerClients).mockReturnValue({} as any);
    vi.mocked(relayer.getRelayerConfig).mockReturnValue({} as any);
    vi.mocked(relayer.isLeader).mockResolvedValue(true);
    vi.mocked(reservations.reserveInvite).mockResolvedValue({
      success: true,
      reservationId: "res-1",
    });
    vi.mocked(reservations.confirmReservation).mockResolvedValue({ success: true });
  });

  it("onboards through the relayer and confirms the reservation", async () => {
    vi.mocked(relayer.onboardLeader).mockResolvedValue({
      status: "onboarded",
      mintHatTxHash,
      claimSignerTxHash,
    } as any);

    const result = await addLeaderViaSignedTypedData(recipient, typedData, signature);

    expect(result).toEqual({ mintHatTxHash, claimSignerTxHash });
    expect(reservations.confirmReservation).toHaveBeenCalledWith(
      expect.objectContaining({ reservationId: "res-1", mintHatTxHash, claimSignerTxHash })
    );
  });

  it("rejects an inviter who is not a leader before reserving", async () => {
    vi.mocked(relayer.isLeader).mockResolvedValue(false);

    const result = await addLeaderViaSignedTypedData(recipient, typedData, signature);

    expect(result).toEqual({ error: "Inviter is not a leader" });
    expect(reservations.reserveInvite).not.toHaveBeenCalled();
    expect(relayer.onboardLeader).not.toHaveBeenCalled();
  });

  it("rolls back the reservation when a transaction fails", async () => {
    vi.mocked(relayer.onboardLeader).mockRejectedValue(new Error("reverted"));

    const result = await addLeaderViaSignedTypedData(recipient, typedData, signature);

    expect(result).toEqual({ error: "Failed to process request" });
    expect(reservations.rollbackReservation).toHaveBeenCalledWith(
      expect.objectContaining({ reservationId: "res-1", reason: "blockchain_failure" })
    );
    expect(reservations.confirmReservation).not.toHaveBeenCalled();
  });

  it("reports an already onboarded recipient", async () => {
    vi.mocked(relayer.onboardLeader).mockResolvedValue({ status: "already_onboarded" });

    const result = await addLeaderViaSignedTypedData(recipient, typedData, signature);

    expect(result).toEqual({ error: "This address is already onboarded as a leader" });
    expect(reservations.confirmReservation).not.toHaveBeenCalled();
  });

  it("fails without reserving when the relayer is not configured", async () => {
    vi.mocked(relayer.getRelayerClients).mockImplementation(() => {
      throw new Error("RELAYER_PRIVATE_KEY is missing or invalid");
    });

    const result = await addLeaderViaSignedTypedData(recipient, typedData, signature);

    expect(result).toEqual({ error: "Required environment variables not configured" });
    expect(reservations.reserveInvite).not.toHaveBeenCalled();
  });
});
