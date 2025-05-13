/**
 * Converts all BigInt values in an object to strings for JSON serialization
 */
export function serializeBigInts(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "bigint") {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeBigInts);
  }

  if (typeof obj === "object") {
    const result: any = {};
    for (const key in obj) {
      result[key] = serializeBigInts(obj[key]);
    }
    return result;
  }

  return obj;
}

/**
 * Converts string values that look like BigInts back to BigInt
 * This is useful when retrieving data from Supabase that originally contained BigInt values
 *
 * Note: This uses a regex to detect strings that look like they were BigInt values
 * You may need to adjust this logic based on your specific data patterns
 */
export function deserializeBigInts(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Check if string looks like a BigInt (only numbers)
  if (typeof obj === "string" && /^-?\d+$/.test(obj) && !Object.is(parseInt(obj), NaN)) {
    try {
      return BigInt(obj);
    } catch {
      return obj; // If conversion fails, return original string
    }
  }

  if (Array.isArray(obj)) {
    return obj.map(deserializeBigInts);
  }

  if (typeof obj === "object") {
    const result: any = {};
    for (const key in obj) {
      result[key] = deserializeBigInts(obj[key]);
    }
    return result;
  }

  return obj;
}
