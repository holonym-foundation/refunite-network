/**
 * Converts EIP-712 TypedData BigInt values to strings for JSON storage
 * Specifically handles the NetworkInvite typed data structure
 */
export function marshalTypedData(typedData: any): any {
  if (typedData === null || typedData === undefined) {
    return typedData;
  }

  if (typeof typedData === "bigint") {
    return typedData.toString();
  }

  if (Array.isArray(typedData)) {
    return typedData.map(marshalTypedData);
  }

  if (typeof typedData === "object") {
    const result: any = {};
    for (const key in typedData) {
      result[key] = marshalTypedData(typedData[key]);
    }
    return result;
  }

  return typedData;
}

/**
 * Converts stored EIP-712 TypedData back to correct types for verification
 * Specifically handles the NetworkInvite typed data structure:
 * - domain.chainId: string → number
 * - message.createdAt: string → BigInt
 * - other fields: preserved as-is
 */
export function unmarshalTypedData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle domain object
  if (data.domain) {
    const domain = { ...data.domain };
    if (typeof domain.chainId === "string" && /^\d+$/.test(domain.chainId)) {
      domain.chainId = Number(domain.chainId);
    }
    return {
      ...data,
      domain,
      message: data.message ? unmarshalMessage(data.message) : data.message,
    };
  }

  return data;
}

/**
 * Helper function to unmarshal message fields
 */
function unmarshalMessage(message: any): any {
  if (!message || typeof message !== "object") {
    return message;
  }

  const result = { ...message };

  // Convert createdAt back to BigInt
  if (typeof result.createdAt === "string" && /^\d+$/.test(result.createdAt)) {
    result.createdAt = BigInt(result.createdAt);
  }

  return result;
}
