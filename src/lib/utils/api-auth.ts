/**
 * Validates if the provided token matches the configured API token
 */
export function validateApiToken(providedToken: string): boolean {
  const expectedToken = process.env.RELAYID_APP_API_TOKEN;

  if (!expectedToken) {
    console.error("RELAYID_APP_API_TOKEN not configured");
    return false;
  }

  return providedToken === expectedToken;
}
