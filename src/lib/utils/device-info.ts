import { UAParser } from "ua-parser-js";

/**
 * Device information collection utility
 * Works on both client-side and server-side environments
 */

export interface DeviceInfo {
  // Basic device identification
  deviceType: string;
  platform: string;

  // Browser information
  browser: string;
  browserVersion: string;
  userAgent: string;

  // Display information
  screenWidth?: number;
  screenHeight?: number;
  screenResolution?: string;

  // System information
  os: string;
  osVersion: string;
  language: string;
  timezone: string;

  // Connection information (if available)
  connectionType?: string;

  // Device capabilities (if available)
  deviceMemory?: number;
  hardwareConcurrency?: number;

  // Collection metadata
  collectedAt: string;
  environment: "client" | "server";
}

function mapUAParserToDeviceInfo(
  result: UAParser.IResult,
  userAgent: string,
  env: "client" | "server"
): Partial<DeviceInfo> {
  // Map device type
  let deviceType: DeviceInfo["deviceType"] = "unknown";
  if (result.device.type === "mobile") deviceType = "mobile";
  else if (result.device.type === "tablet") deviceType = "tablet";
  else if (result.device.type === "desktop" || !result.device.type) deviceType = "desktop";

  // Map platform
  let platform: DeviceInfo["platform"] = "unknown";
  if (result.os.name) {
    const os = result.os.name.toLowerCase();
    if (os.includes("ios")) platform = "iOS";
    else if (os.includes("android")) platform = "Android";
    else if (os.includes("windows")) platform = "Windows";
    else if (os.includes("mac")) platform = "macOS";
    else if (os.includes("linux")) platform = "Linux";
  }

  return {
    deviceType,
    platform,
    browser: result.browser.name || "unknown",
    browserVersion: result.browser.version || "unknown",
    userAgent,
    os: result.os.name || "unknown",
    osVersion: result.os.version || "unknown",
    environment: env,
  };
}

/**
 * Collect device information on the client side
 * Uses browser APIs to gather comprehensive device information
 */
export function getClientDeviceInfo(): DeviceInfo {
  const now = new Date().toISOString();
  const userAgent = navigator.userAgent;
  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  const base = mapUAParserToDeviceInfo(result, userAgent, "client");

  // Screen info
  let screenWidth, screenHeight, screenResolution;
  if (typeof screen !== "undefined") {
    screenWidth = screen.width;
    screenHeight = screen.height;
    screenResolution = `${screen.width}x${screen.height}`;
  }

  // Device capabilities
  let deviceMemory, hardwareConcurrency;
  if ("deviceMemory" in navigator) {
    deviceMemory = (navigator as any).deviceMemory;
  }
  if ("hardwareConcurrency" in navigator) {
    hardwareConcurrency = navigator.hardwareConcurrency;
  }

  // Connection info
  let connectionType: DeviceInfo["connectionType"] = "unknown";
  if ("connection" in navigator) {
    const connection = (navigator as any).connection;
    if (connection && connection.effectiveType) {
      if (connection.effectiveType.includes("wifi")) connectionType = "wifi";
      else if (
        ["2g", "3g", "4g", "5g", "cellular"].some((t) => connection.effectiveType.includes(t))
      )
        connectionType = "cellular";
      else if (connection.effectiveType.includes("ethernet")) connectionType = "ethernet";
    }
  }

  return {
    ...base,
    screenWidth,
    screenHeight,
    screenResolution,
    deviceMemory,
    hardwareConcurrency,
    connectionType,
    language: navigator.language || "unknown",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown",
    collectedAt: now,
    environment: "client",
  } as DeviceInfo;
}

/**
 * Get device information that works in both client and server environments
 * Falls back to user agent parsing on server side
 */
export function getDeviceInfo(userAgent?: string): DeviceInfo {
  if (typeof window !== "undefined" && typeof navigator !== "undefined") {
    return getClientDeviceInfo();
  }
  const ua = userAgent || "";
  const parser = new UAParser(ua);
  const result = parser.getResult();
  const base = mapUAParserToDeviceInfo(result, ua, "server");
  return {
    ...base,
    language: "unknown",
    timezone: "unknown",
    collectedAt: new Date().toISOString(),
    environment: "server",
  } as DeviceInfo;
}

/**
 * Create a minimal device info object for audit logs
 * Filters out potentially sensitive information
 */
export function getAuditDeviceInfo(userAgent?: string): Partial<DeviceInfo> {
  const fullInfo = getDeviceInfo(userAgent);
  return {
    deviceType: fullInfo.deviceType,
    platform: fullInfo.platform,
    browser: fullInfo.browser,
    browserVersion: fullInfo.browserVersion,
    os: fullInfo.os,
    osVersion: fullInfo.osVersion,
    screenResolution: fullInfo.screenResolution,
    language: fullInfo.language,
    timezone: fullInfo.timezone,
    connectionType: fullInfo.connectionType,
    collectedAt: fullInfo.collectedAt,
    environment: fullInfo.environment,
  };
}
