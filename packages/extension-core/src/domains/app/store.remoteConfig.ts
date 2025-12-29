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
    rampNetworks: {
      POLKADOT: "polkadot",
      ETH: "1",
    },
  },
  swaps: {
    questApi: "",
    lifiTalismanTokens: [],
    lifiCustomFeeTokens: {},
    simpleswapApiKey: "",
    simpleswapApiKeyDiscounted: "",
    simpleswapDiscountedCurrencies: [],
    curatedTokens: [],
    promotedBuyTokens: [],
    promotedSellTokens: [],
  },
  coingecko: {
    apiUrl: "https://api.coingecko.com",
  },
  postHogUrl: "https://us.i.posthog.com/batch/",
  nominationPools: {
    // uncomment for testing on testnets
    // "avail-turing-testnet": [1],
    // "vara-testnet": [1],
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
    stakingEarlyRewardBoost: "",
    discountTiers: [],
  },
  bittensor: {
    fee: {
      buy: {},
      sell: {},
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

        if (DEBUG) {
          config.featureFlags.SEEK_BENEFITS = true
          config.featureFlags.SEEK_TAO_DISCOUNT = true
          config.featureFlags.ASSET_HUB_MIGRATION_BANNER = true
          config.featureFlags.SEEK_PRESALE = true
        }

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

export const isFeatureFlagEnabled = async (flag: keyof RemoteConfigStoreData["featureFlags"]) => {
  try {
    const featureFlags = await remoteConfigStore.get("featureFlags")
    return !!featureFlags[flag]
  } catch (err) {
    log.error("Error checking feature flag:", { flag, err })
    return false
  }
}
