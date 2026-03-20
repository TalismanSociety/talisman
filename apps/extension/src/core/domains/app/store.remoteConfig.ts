import { DEBUG, TEST } from "@common/constants"
import { log } from "@common/log"
import merge from "lodash-es/merge"

import { StorageProvider } from "../../libs/Store"
import { fetchRemoteConfig } from "./remote-config/fetchRemoteConfig"
import type { RemoteConfigStoreData } from "./types"

// default value so code doesnt break if remote config cannot be fetched after install.
const DEFAULT_REMOTE_CONFIG: RemoteConfigStoreData = {
  featureFlags: {
    BUY_CRYPTO: true,
    LINK_TX_HISTORY: true,
    LINK_STAKING: true,
    I18N: false,
    USE_ONFINALITY_API_KEY: false,
    SWAPS: true,
    QUEST_LINK: true,
    UNIFIED_ADDRESS_BANNER: false,
    RISK_ANALYSIS_V2: true,
    AUTONOMYS_QUEST_BANNER: false,
    NFTS_V2: true,
    SEEK_TAO_DISCOUNT: true,
    SEEK_BENEFITS: true,
    SEEK_PRESALE: false,
    BLOCKAID_DAPP_SCAN: false,
    ASSET_HUB_MIGRATION_BANNER: false,
    BITTENSOR_MEV_SHIELD: true,
  },
  ramps: {
    rampApiKey: "",
    coinbaseProjectId: "",
    pinnedTokens: [],
    rampNetworks: {},
  },
  swaps: {
    lifiTalismanTokens: [],
    lifiCustomFeeTokens: {},
    simpleswapApiKey: "",
    simpleswapApiKeyDiscounted: "",
    simpleswapDiscountedCurrencies: [],
    curatedTokens: [],
    promotedBuyTokens: [],
    promotedSellTokens: [],
    lifiApiKey: "",
    simpleswap: { networks: {}, tokens: {} },
    stealthex: { networks: {}, tokens: {} },
    lifi: {
      solanaChainId: 1151111081099710,
    },
  },
  coingecko: {
    apiUrl: "https://cgp.talisman.xyz",
  },
  nominationPools: {},
  stakingPools: {},
  documentation: {
    unifiedAddressDocsUrl: "",
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
  earn: {
    yieldxyzNetworks: {},
  },
  bittensor: {
    fee: {
      buy: {},
      sell: {},
    },
  },
  recommendedNetworks: [],
  postHogUrl: "https://us.i.posthog.com/batch/",
}

const CONFIG_TIMEOUT = 30 * 60 * 1000 // 30 minutes

class RemoteConfigStore extends StorageProvider<RemoteConfigStoreData> {
  // call this only once, and only from background script
  async init() {
    const updateConfig = async () => {
      try {
        const config = await fetchRemoteConfig()

        // safety measure, most likely always an object
        if (!config) return

        if (DEBUG) {
          // tweak config for testing purposes
        }

        // first arg is an empty object so that DEFAULT_REMOTE_CONFIG is not mutated
        await this.mutate(() => merge({}, DEFAULT_REMOTE_CONFIG, config))
      } catch (err) {
        log.error("Unable to fetch remote config", { cause: err })
      }
    }

    // await first update
    await updateConfig()

    // refresh periodically
    if (!TEST) setInterval(updateConfig, CONFIG_TIMEOUT)
  }
}

export const remoteConfigStore = new RemoteConfigStore("remoteConfig", DEFAULT_REMOTE_CONFIG)
