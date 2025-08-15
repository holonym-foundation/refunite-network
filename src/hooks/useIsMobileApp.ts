import { Capacitor } from "@capacitor/core";

export function useIsMobileApp() {
  return Capacitor.getPlatform() === "ios" || Capacitor.getPlatform() === "android";
}
