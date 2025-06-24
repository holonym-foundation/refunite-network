import { InitSilkOptions } from "@silk-wallet/silk-wallet-sdk/dist/lib/provider/types";

export const silkConfig: InitSilkOptions = {
  useProd: true,
  useStaging: false,
  project: { name: "RelayID", projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID },
  config: {
    // authenticationMethods: ["wallet"], //'email' | 'wallet' | 'phone' | 'social';
    allowedSocials: ["google"], //'apple' | 'coinbase' | 'discord' | 'github' | 'google' | 'linkedin' | 'orcid' | 'twitter';
    styles: {
      darkMode: false,
    },
  },
};
