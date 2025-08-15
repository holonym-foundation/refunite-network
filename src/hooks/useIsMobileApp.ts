import { useEffect, useState } from "react";

export function useIsMobileApp() {
  const [isMobileApp, setIsMobileApp] = useState(false);

  useEffect(() => {
    // Check if we're running in a Capacitor/Cordova environment
    const checkMobileApp = () => {
      // Check for Capacitor
      const isCapacitor = typeof window !== "undefined" && (window as any).Capacitor;

      // Check for Cordova
      const isCordova = typeof window !== "undefined" && (window as any).cordova;

      // Check for Capacitor plugins
      const hasCapacitorPlugins =
        typeof window !== "undefined" && (window as any).Capacitor?.Plugins;

      // Check for Android/iOS specific APIs
      const hasNativeAPIs =
        typeof window !== "undefined" &&
        ((window as any).Android || (window as any).webkit?.messageHandlers);

      // Check user agent for mobile app indicators
      const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
      const isMobileAppUA =
        userAgent.includes("Capacitor") ||
        userAgent.includes("Cordova") ||
        userAgent.includes("Mobile") ||
        userAgent.includes("Android") ||
        userAgent.includes("iPhone") ||
        userAgent.includes("iPad");

      setIsMobileApp(
        isCapacitor || isCordova || hasCapacitorPlugins || hasNativeAPIs || isMobileAppUA
      );
    };

    checkMobileApp();
  }, []);

  return isMobileApp;
}
