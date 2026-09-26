# Mobile: check and redeem disbursements

Instructions for implementing the beneficiary side of RelayID disbursements in the mobile app. The web version is `src/app/redeem/page.tsx` in the `refunite-network` repo; this document is the contract the mobile app must follow.

## Background

- A Community Leader registers a **beneficiary** by their Stellar account address (`G…`, 56 characters) and creates **disbursements** of XLM to them.
- Nothing is paid until the beneficiary **redeems**. Redeeming makes the server send the XLM from the RelayID treasury to the beneficiary's Stellar account.
- The beneficiary proves they own the account by signing a short text message with the account's Stellar key (ed25519, SEP-53). No Stellar transaction is built or signed on the device, and the beneficiary pays no fees.
- The mobile app needs access to the beneficiary's Stellar keypair (or a wallet that can sign messages for it). How the app stores or obtains that key is outside this document. The app only needs a `signMessage(text) -> 64-byte signature` for the account.

## Configuration

| Setting                      | Testnet value                       | Notes                                                                                                                         |
| ---------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `API_BASE_URL`               | the RelayID web app origin          | e.g. `https://<relayid-host>`; must be HTTPS in production                                                                    |
| `STELLAR_NETWORK_PASSPHRASE` | `Test SDF Network ; September 2015` | must equal the server's `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE`; mainnet is `Public Global Stellar Network ; September 2015` |

If the passphrase differs from the server's, every signature fails with `401 invalid_signature`.

## Flow

1. **Sign in** (once per 24 hours): sign a `StartStellarSession` message, `POST /api/session/stellar`, keep the session cookie.
2. **List** disbursements: `GET /api/disbursements/mine` with the cookie.
3. **Redeem** a `pending` disbursement: sign a `RedeemDisbursement` message for its id, `POST /api/disbursements/redeem`. The response is the updated disbursement (`redeemed`, with `txHash`).
4. **Sign out**: `DELETE /api/session/stellar`, and clear the stored cookie.

Each signed message is single-use and valid for **5 minutes** (with up to 60 seconds of tolerance for a device clock that runs ahead). Build and sign it right before sending; never cache or retry with the same message. A retry needs a fresh nonce, a fresh `issuedAt` and a new signature.

## Signed messages

### Fields

Every message has:

- `nonce`: a random string, 8 to 128 characters. Use at least 16 random alphanumeric characters (e.g. from a secure random generator). Each nonce can be used only once.
- `issuedAt`: the current Unix time in **seconds**, sent as a decimal **string** in JSON (e.g. `"1790000000"`).

| Action                | Fields (besides `nonce`, `issuedAt`)                                       |
| --------------------- | -------------------------------------------------------------------------- |
| `StartStellarSession` | `account`: the beneficiary's `G…` address                                  |
| `RedeemDisbursement`  | `beneficiary`: the `G…` address; `disbursementId`: the disbursement's UUID |

No other fields are allowed: the server rejects unknown keys with `400 invalid_request`.

### Text to sign

The server rebuilds this text from the fields and checks the signature against it, so it must match **byte for byte**. Lines are joined with a single `\n` (no `\r`, no trailing newline), UTF-8:

```
RelayID
<statement>
Action: <action>
Account: <G… address>
Disbursement: <disbursementId>        ← only for RedeemDisbursement
Network: <STELLAR_NETWORK_PASSPHRASE>
Nonce: <nonce>
Issued at: <issuedAt>
```

Statements:

- `StartStellarSession`: `Sign in to RelayID to see your disbursements.`
- `RedeemDisbursement`: `Redeem a disbursement into this Stellar account.`

### Signature (SEP-53)

```
hash      = SHA-256( UTF8("Stellar Signed Message:\n") || UTF8(text) )
signature = ed25519_sign(account_secret_key, hash)      // 64 bytes
```

This is what `Keypair.signMessage(text)` does in `@stellar/stellar-sdk` (JS, v13+), and what Freighter's `signMessage` returns. Send the 64 bytes as **base64** (128 hex characters is also accepted).

Do not sign `hash` with any other prefix, and do not hex- or base64-encode the text before signing.

### Test vectors

Use these to unit test the message builder and the signer. The key is a throwaway test key (raw ed25519 seed of 32 bytes of `0x07`); never fund or use it for anything else.

- Secret: `SADQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQP54X`
- Account: `GDVEU3DD4KOFECV66VIHWEZOYX4ZKR3WV27L464SIIPOU2IUI3JCZA57`
- Passphrase: `Test SDF Network ; September 2015`, nonce `a1b2c3d4e5f6g7h8`, issuedAt `1790000000`

`StartStellarSession` text:

```
RelayID
Sign in to RelayID to see your disbursements.
Action: StartStellarSession
Account: GDVEU3DD4KOFECV66VIHWEZOYX4ZKR3WV27L464SIIPOU2IUI3JCZA57
Network: Test SDF Network ; September 2015
Nonce: a1b2c3d4e5f6g7h8
Issued at: 1790000000
```

Signature (base64): `q8/WAdBqY/xeDKbwrkqvtQUJvcE7E5K+HljYdy7y/e4GKBcDcxfepMmTF+MosDUa88RRJbpL4ikEXzGRMKhSBQ==`

`RedeemDisbursement` text (disbursement `6a55325a-29c2-4053-be2a-ebf91d7a0358`):

```
RelayID
Redeem a disbursement into this Stellar account.
Action: RedeemDisbursement
Account: GDVEU3DD4KOFECV66VIHWEZOYX4ZKR3WV27L464SIIPOU2IUI3JCZA57
Disbursement: 6a55325a-29c2-4053-be2a-ebf91d7a0358
Network: Test SDF Network ; September 2015
Nonce: a1b2c3d4e5f6g7h8
Issued at: 1790000000
```

Signature (base64): `ixpLscTGFGFmYaXhIa171bqOr0VbdfHG1s3RlRdovgzOiuyl9ZJ32pS+zSC4aJs+uoqbB3C4xT/cV5VuB6zZAA==`

(ed25519 signatures are deterministic, so your signer must produce exactly these bytes. The server will reject these exact messages as expired; they are for offline tests only.)

## API

All requests and responses are JSON (`Content-Type: application/json`). Errors have the shape `{ "error": "<human message>", "code": "<machine code>" }`; branch on `code`, not on `error`.

### `POST /api/session/stellar`: sign in

```json
{
  "message": {
    "account": "G…",
    "nonce": "…",
    "issuedAt": "1790000000"
  },
  "signature": "<base64>"
}
```

`200` → `{ "address": "G…", "expiresAt": 1790086400 }` (Unix seconds, 24 hours later), plus a `Set-Cookie` for `relayid_stellar_session` (HttpOnly, `Path=/api`, `Secure` in production).

The session is a cookie, so the HTTP client must keep it:

- With a cookie-aware client (e.g. React Native `fetch` on iOS/Android, OkHttp with a `CookieJar`, `URLSession` with `HTTPCookieStorage`), make sure cookies are enabled and persisted for `API_BASE_URL`.
- Otherwise, read the `relayid_stellar_session=<token>` value from `Set-Cookie` and store the token in secure storage (Keychain / Keystore), then send `Cookie: relayid_stellar_session=<token>` on later requests under `/api`.

Store `expiresAt` too, and sign in again when it has passed (or on any `401 no_session`).

### `GET /api/session/stellar`: current session

`200` → `{ "address": "G…", "expiresAt": … }`, or `401` when there is no valid session. Useful on app start to decide whether to sign in again.

### `DELETE /api/session/stellar`: sign out

`200` → `{ "ended": true }`, and the cookie is cleared. Also delete any token the app stored itself.

### `GET /api/disbursements/mine`: list disbursements

Needs the session cookie. `200` →

```json
{
  "disbursements": [
    {
      "id": "6a55325a-29c2-4053-be2a-ebf91d7a0358",
      "beneficiary": "G…",
      "amount": "1",
      "status": "pending",
      "txHash": null,
      "createdAt": "2026-10-02T15:20:11.000Z",
      "redeemedAt": null
    }
  ]
}
```

- Newest first. An account that is not a registered beneficiary gets an empty list (not an error).
- `amount` is a decimal **string** of XLM with up to 7 decimals. Display it as-is or with a decimal type; don't parse it into a float for arithmetic.
- `401 no_session`: sign in again.

Statuses and what to show:

| `status`       | Meaning                                                                                                         | UI                                         |
| -------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `pending`      | ready to redeem                                                                                                 | **Redeem** button                          |
| `redeeming`    | a redeem is in progress                                                                                         | "Processing…", no button; refresh later    |
| `redeemed`     | paid; `txHash` and `redeemedAt` are set                                                                         | "Received", with a link to the transaction |
| `needs_review` | a payment was sent but not confirmed; the server settles it automatically within minutes, or a person checks it | "Being checked", no button                 |
| `cancelled`    | the leader withdrew it                                                                                          | "Cancelled", no button (or hide)           |

Transaction link: `https://stellar.expert/explorer/testnet/tx/<txHash>` (on mainnet, `/explorer/public/`).

### `POST /api/disbursements/redeem`: redeem

No cookie needed; the signature is the authorization.

```json
{
  "message": {
    "beneficiary": "G…",
    "disbursementId": "6a55325a-29c2-4053-be2a-ebf91d7a0358",
    "nonce": "…",
    "issuedAt": "1790000000"
  },
  "signature": "<base64>"
}
```

`200` → `{ "disbursement": { …, "status": "redeemed", "txHash": "…", "redeemedAt": "…" } }`.

The server waits for the payment to be confirmed on the Stellar network before answering, which usually takes about 5 to 10 seconds and can take up to a minute. Use a request timeout of at least **70 seconds**, show a progress state, and disable the button while the request is open so it can't be sent twice. (A second redeem for the same disbursement is refused by the server, so double taps can't pay twice, but they would show a confusing error.)

After any response, success or error, refresh the list with `GET /api/disbursements/mine`.

If the request times out or the connection drops, **don't** retry the redeem blindly: the payment may have gone through. Refresh the list and act on the status shown there.

## Errors

| HTTP | `code`                   | When                                                                    | What the app should do                                                |
| ---- | ------------------------ | ----------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 400  | `invalid_request`        | malformed body, unknown field, bad address or signature encoding        | bug in the app; log it                                                |
| 401  | `invalid_signature`      | signature doesn't match the text (wrong key, passphrase or text format) | bug or wrong network config; log it                                   |
| 401  | `expired_signature`      | `issuedAt` older than 5 minutes or more than 60 s ahead                 | check the device clock; sign a new message and retry once             |
| 401  | `no_session`             | no or expired session (list only)                                       | sign in again                                                         |
| 403  | `not_beneficiary`        | the account is not a registered beneficiary (redeem)                    | "This account has no disbursements"                                   |
| 404  | `disbursement_not_found` | no such disbursement for this account                                   | refresh the list                                                      |
| 409  | `replay`                 | the nonce was already used                                              | sign a new message (new nonce)                                        |
| 409  | `not_redeemable`         | not `pending` any more (already redeemed, in progress, cancelled)       | refresh the list                                                      |
| 502  | `payment_failed`         | the payment did not go through; it's back to `pending`                  | "Payment failed, try again"; the user can redeem again                |
| 502  | `payment_unconfirmed`    | sent but not confirmed; now `needs_review`                              | "Payment sent, waiting for confirmation"; refresh later; do not retry |
| 500  | (no code)                | server misconfigured or unexpected error                                | generic error; retry later                                            |

## Acceptance criteria

- [ ] A beneficiary can sign in with their Stellar account and stays signed in for up to 24 hours, including across app restarts.
- [ ] The app lists the account's disbursements with amount, date and status; an account with none sees an empty state.
- [ ] Redeeming a `pending` disbursement pays it and shows it as received with a link to the transaction.
- [ ] Only `pending` disbursements can be redeemed from the UI; a redeem can't be started twice at once.
- [ ] Each error code above shows the described behaviour, and an expired session leads back to sign in.
- [ ] Signing out clears the session on the server and on the device.
- [ ] Unit tests reproduce both test vectors exactly (text and base64 signature).

## Testing on testnet

1. Create a testnet account (e.g. in Freighter or the [Stellar Laboratory](https://laboratory.stellar.org/#account-creator?network=test)) and import its key into the app.
2. Ask a Community Leader to add the account as a beneficiary and disburse to it from the RelayID web app (`/beneficiaries`). A disbursement to an account that doesn't exist on the network yet must be at least 1 XLM; that first payment creates the account.
3. In the app, sign in, see the `pending` disbursement, redeem it, and check the transaction on stellar.expert (testnet).

Server-side reference: `src/lib/stellar/signed-actions.ts` (text format), `src/lib/signed-actions/index.ts` (`verifyStellarAction`), `src/app/api/session/stellar/route.ts`, `src/app/api/disbursements/mine/route.ts`, `src/app/api/disbursements/redeem/route.ts`.
