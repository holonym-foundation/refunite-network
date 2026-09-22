import { generateNonce } from "@/lib/eip712";
import {
  SIGNER_ROLE,
  SignedActionMessage,
  SignedActionType,
  createSignedActionTypedData,
} from "@/lib/eip712/signed-actions";
import { PrivateKeyAccount, privateKeyToAccount } from "viem/accounts";

// Well-known Anvil test keys
export const accounts = {
  leaderA: privateKeyToAccount(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
  ),
  leaderB: privateKeyToAccount(
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
  ),
  beneficiary: privateKeyToAccount(
    "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6"
  ),
  stranger: privateKeyToAccount(
    "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a"
  ),
};

/** Signs an action as `signer` and returns the JSON request body `{ message, signature }`. */
export async function signedBody<T extends SignedActionType>(
  signer: PrivateKeyAccount,
  primaryType: T,
  fields: Omit<SignedActionMessage<T>, (typeof SIGNER_ROLE)[T] | "nonce" | "issuedAt">,
  { chainId, issuedAt = Math.floor(Date.now() / 1000) }: { chainId: number; issuedAt?: number }
) {
  const message = {
    ...fields,
    [SIGNER_ROLE[primaryType]]: signer.address,
    nonce: generateNonce(),
    issuedAt: BigInt(issuedAt),
  } as unknown as SignedActionMessage<T>;
  const signature = await signer.signTypedData(
    createSignedActionTypedData(primaryType, message, chainId) as never
  );
  const json = Object.fromEntries(Object.entries(message).map(([k, v]) => [k, String(v)]));
  return { message: json, signature };
}

/** Starts a session for `signer` via POST /api/session and returns its Cookie header. */
export async function sessionCookie(signer: PrivateKeyAccount, chainId: number) {
  const { POST } = await import("@/app/api/session/route");
  const { NextRequest } = await import("next/server");
  const res = await POST(
    new NextRequest("http://localhost/api/session", {
      method: "POST",
      body: JSON.stringify(await signedBody(signer, "StartSession", {}, { chainId })),
    })
  );
  if (res.status !== 200) throw new Error(`StartSession failed: ${res.status}`);
  const cookie = res.headers.get("set-cookie") ?? "";
  return cookie.split(";")[0]; // "relayid_session=…"
}
