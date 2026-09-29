// Shared with the client, so it must not import server-only modules.

/** A signature is accepted for this long after its issuedAt. */
export const MAX_SIGNATURE_AGE_SECONDS = 5 * 60;
/** Tolerated client clock drift for an issuedAt in the future. */
export const MAX_CLOCK_SKEW_SECONDS = 60;
