import {
  InitSilkOptions,
  initWaaP,
  SILK_METHOD,
  SilkEthereumProviderInterface,
} from "@human.tech/waap-sdk";
import { ChainNotConfiguredError, createConnector } from "@wagmi/core";
import { Chain, getAddress, SwitchChainError, UserRejectedRequestError } from "viem";

import { silkConfig } from "./silk-config";
import { defaultChain } from "./chain-config";

/**
 * Creates a WAGMI connector for the WaaP (formerly Silk) wallet SDK
 * @param options Initialization options for the WaaP SDK. If not provided, uses the default configuration.
 * @returns
 */
export default function silk(options: InitSilkOptions = silkConfig) {
  let silkProvider: SilkEthereumProviderInterface | null = null;

  return createConnector<SilkEthereumProviderInterface>((config) => ({
    id: "silk",
    name: "WaaP",
    type: "Silk",
    chains: config.chains,
    supportsSimulation: false,

    async connect({ chainId } = {}) {
      try {
        config.emitter.emit("message", {
          type: "connecting",
        });
        const provider = await this.getProvider();

        provider.on("accountsChanged", this.onAccountsChanged);
        provider.on("chainChanged", this.onChainChanged);
        provider.on("disconnect", this.onDisconnect);

        if (!provider.connected) {
          try {
            await provider.login();
          } catch (error) {
            console.warn("Unable to login", error);
            throw new UserRejectedRequestError("User rejected login" as unknown as Error);
          }
        }

        let currentChainId = await this.getChainId();

        // If no specific chainId is provided, use the default chain
        const targetChainId = chainId || defaultChain.id;

        if (currentChainId !== targetChainId) {
          const chain = await this.switchChain!({ chainId: targetChainId }).catch((error) => {
            if (error.code === UserRejectedRequestError.code) throw error;
            return { id: currentChainId };
          });
          currentChainId = chain?.id ?? currentChainId;
        }

        const accounts = await this.getAccounts();

        return { accounts, chainId: currentChainId };
      } catch (error) {
        console.error("Error while connecting", error);
        this.onDisconnect();
        throw error;
      }
    },

    async getAccounts() {
      const provider = await this.getProvider();
      const accounts = await provider.request({
        method: SILK_METHOD.eth_accounts,
      });

      if (accounts && Array.isArray(accounts)) return accounts.map((x: string) => getAddress(x));
      return [];
    },

    async getChainId() {
      const provider = await this.getProvider();
      const chainId = await provider.request({
        method: SILK_METHOD.eth_chainId,
      });
      return Number(chainId);
    },

    async getProvider(): Promise<SilkEthereumProviderInterface> {
      if (!silkProvider) {
        silkProvider = initWaaP(options);

        //@ts-ignore
        window.silk = silkProvider;
      }

      return silkProvider;
    },

    async isAuthorized() {
      try {
        const accounts = await this.getAccounts();
        return !!accounts.length;
      } catch {
        return false;
      }
    },

    async switchChain({ chainId }): Promise<Chain> {
      try {
        const chain = config.chains.find((x) => x.id === chainId);
        if (!chain) throw new SwitchChainError(new ChainNotConfiguredError());

        const provider = await this.getProvider();
        // Silk currently does not support adding chains. Leaving this here for future reference.
        // await provider.request({
        //   method: SILK_METHOD.wallet_addEthereumChain,
        //   params: [
        //     {
        //       chainId: `0x${chain.id.toString(16)}`,
        //       chainName: chain.name,
        //       rpcTarget: chain.rpcUrls.default.http[0],
        //       nativeCurrency: chain.nativeCurrency,
        //       logo: chain.nativeCurrency?.symbol,
        //       decimals: chain.nativeCurrency?.decimals || 18,
        //       ticker: chain.nativeCurrency?.symbol || 'ETH',
        //       tickerName: chain.nativeCurrency?.name || 'Ethereum',
        //       rpcUrls: chain.rpcUrls,
        //       blockExplorerUrls: chain.blockExplorers,
        //     },
        //   ],
        // });
        // console.info('Chain Added: ', chain.name);
        await provider.request({
          method: SILK_METHOD.wallet_switchEthereumChain,
          params: [{ chainId: `0x${chain.id.toString(16)}` }],
        });
        console.info("Chain switched to:", chain.name, chain.id);
        config.emitter.emit("change", {
          chainId,
        });
        return chain;
      } catch (error: unknown) {
        console.error("Error: Unable to switch chain", error);
        throw new SwitchChainError(error as Error);
      }
    },

    async disconnect(): Promise<void> {
      const provider = await this.getProvider();
      await provider.logout();
    },

    onAccountsChanged(accounts) {
      if (accounts.length === 0) config.emitter.emit("disconnect");
      else
        config.emitter.emit("change", {
          accounts: accounts.map((x) => getAddress(x)),
        });
    },

    onChainChanged(chain) {
      const chainId = Number(chain);
      config.emitter.emit("change", { chainId });
    },

    onDisconnect(): void {
      config.emitter.emit("disconnect");
    },
  }));
}
