// XLM amounts as exact integers of stroops (1 XLM = 10,000,000 stroops); never floats.
const STROOPS_PER_XLM = BigInt(10_000_000);

/** "1.5" → 15000000n. Accepts up to 7 decimals (also the numeric(20,7) form "1.5000000"). */
export function xlmToStroops(xlm: string): bigint {
  const match = /^(\d+)(?:\.(\d{1,7}))?$/.exec(xlm.trim());
  if (!match) throw new Error(`Invalid XLM amount: ${xlm}`);
  const [, whole, fraction = ""] = match;
  return BigInt(whole) * STROOPS_PER_XLM + BigInt(fraction.padEnd(7, "0"));
}

/** 15000000n → "1.5" (no trailing zeros). */
export function stroopsToXlm(stroops: bigint): string {
  const negative = stroops < BigInt(0);
  const abs = negative ? -stroops : stroops;
  const whole = abs / STROOPS_PER_XLM;
  const fraction = (abs % STROOPS_PER_XLM).toString().padStart(7, "0").replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}
