import { InitSilkOptions } from "@silk-wallet/silk-wallet-sdk/dist/lib/provider/types";

const isDevelopment = process.env.NODE_ENV === "development";
const isPreview = process.env.VERCEL_ENV === "preview";

export const silkConfig: InitSilkOptions = {
  useStaging: isDevelopment || isPreview,
  project: { name: "RelayID" },
};
