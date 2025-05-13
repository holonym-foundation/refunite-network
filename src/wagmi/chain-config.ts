import { Chain, celo, sepolia } from "wagmi/chains";

const isDevelopment = process.env.NODE_ENV === "development";
const isPreview = process.env.VERCEL_ENV === "preview";

export const defaultChain = isDevelopment || isPreview ? sepolia : celo;

export const supportedChains: readonly [Chain, ...Chain[]] = [sepolia, celo];
