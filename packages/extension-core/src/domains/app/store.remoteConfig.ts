import { evmNativeTokenId, subNativeTokenId } from "@talismn/chaindata-provider"
import { DEBUG, log, TEST } from "extension-shared"
import merge from "lodash-es/merge"

import { StorageProvider } from "../../libs/Store"
import { fetchRemoteConfig } from "../../util/fetchRemoteConfig"
import { RemoteConfigStoreData } from "./types"

export const DEFAULT_REMOTE_CONFIG: RemoteConfigStoreData = {
  featureFlags: {},
  ramps: {
    coinbaseProjectId: "63080e24-dc8e-45d0-9618-467b8c222f9e",
    pinnedTokens: [
      subNativeTokenId("polkadot"),
      evmNativeTokenId("1"),
      subNativeTokenId("bittensor"),
    ],
    rampApiKey: "5ga4dyv63auqe9t2ytrcz8jaaudmq4m2js8egzsh",
    rampNetworks: {
      POLKADOT: "polkadot",
      ETH: "1",
    },
  },
  swaps: {
    questApi: "",
    lifiApiKey: "",
    lifiTalismanTokens: [],
    simpleswapApiKey: "",
    simpleswapApiKeyDiscounted: "",
    simpleswapDiscountedCurrencies: [],
    curatedTokens: [],
  },
  coingecko: {
    apiUrl: "https://api.coingecko.com",
  },
  postHogUrl: "https://us.i.posthog.com/batch/",
  nominationPools: {
    // uncomment for testing on testnets
    // "avail-turing-testnet": [1],
    // "vara-testnet": [1],
    // "aleph-zero-testnet": [1],
  },
  stakingPools: {},
  documentation: {
    unifiedAddressDocsUrl:
      "https://polkadot-ux-bounty.notion.site/UXB-1-User-Wiki-Page-188e1c2781f380259c4ef29041bacc49",
  },
  seek: {
    tokenId: "",
    stakingUrl: "",
    docsUrl: "",
    tradeUrl: "",
    stakingContractNetworkId: "",
    stakingContractAddress: "0x",
    webAppStakingPath: "",
  },
  earn: {
    earnButtonTokenIds: [
      // "1:evm-native", // ETH on mainnet
      // "8453:evm-native", // ETH on base
      // "1:evm-erc20:0xdac17f958d2ee523a2206206994597c13d831ec7", // USDT on mainnet
      // "8453:evm-erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // USDC on base
      // "solana-mainnet:sol-native", // SOL on solana mainnet
      // "polkadot:substrate-native", // DOT on polkadot
    ],
    yieldxyzNetworks: {
      // ethereum: "1",
      // polygon: "137",
      // optimism: "10",
      // solana: "solana-mainnet",
    },
  },
}

const CONFIG_TIMEOUT = 30 * 60 * 1000 // 30 minutes

export class RemoteConfigStore extends StorageProvider<RemoteConfigStoreData> {
  // call this only once, and only from background script
  async init() {
    const updateConfig = async () => {
      try {
        const config = await fetchRemoteConfig()

        // safety measure, most likely always an object
        if (!config) return

        // as per 2.8.0 we dont want this address to be the default validator anymore.
        // versions prior to 2.8.0 expect a value there so GH config file cant be altered, we need to remove it at runtime
        config.stakingPools["bittensor"] = config.stakingPools["bittensor"]?.filter(
          (address) => address !== "5ELREhApbCahM7FyGLM1V9WDsnnjCRmMCJTmtQD51oAEqwVh",
        )

        if (DEBUG) config.featureFlags.SEEK_BENEFITS = true

        // first arg is an empty object so that DEFAULT_REMOTE_CONFIG is not mutated
        await this.mutate(() => merge({}, DEFAULT_REMOTE_CONFIG, config))
      } catch (err) {
        log.error("Unable to fetch config.toml", { cause: err })
      }
    }

    // await first update
    await updateConfig()

    // refresh periodically
    if (!TEST) setInterval(updateConfig, CONFIG_TIMEOUT)
  }
}

export const remoteConfigStore = new RemoteConfigStore("remoteConfig", DEFAULT_REMOTE_CONFIG)
