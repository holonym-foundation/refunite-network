import crypto from "crypto";

export interface WebhookGenerateOptions {
  webhookSecret: string;
  payload: string;
  timestamp?: string;
}

/**
 * Generates webhook HMAC signature with timestamp for sending to webhook receiver
 */
export function generateWebhookSignature(options: WebhookGenerateOptions): {
  signature: string;
  timestamp: string;
} {
  const { webhookSecret, payload, timestamp: providedTimestamp } = options;

  const timestamp = providedTimestamp || Math.floor(Date.now() / 1000).toString();

  const signature = crypto
    .createHmac("sha256", webhookSecret)
    .update(timestamp + payload)
    .digest("hex");

  return {
    signature,
    timestamp,
  };
}
