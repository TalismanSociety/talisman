import { DEBUG, log, TEST } from "extension-shared"
import merge from "lodash/merge"

import { StorageProvider } from "../../libs/Store"
import { fetchRemoteConfig } from "../../util/fetchRemoteConfig"
import { RemoteConfigStoreData } from "./types"

export const DEFAULT_REMOTE_CONFIG: RemoteConfigStoreData = {
  featureFlags: {},
  ramps: {
    coinbaseProjectId: "63080e24-dc8e-45d0-9618-467b8c222f9e",
    pinnedTokens: ["polkadot-substrate-native", "1-evm-native", "bittensor-substrate-native"],
    rampApiKey: "5ga4dyv63auqe9t2ytrcz8jaaudmq4m2js8egzsh",
    rampNetworks: {
      POLKADOT: "polkadot",
      ETH: "1",
    },
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
  stakingPools: {
    // uncomment for testing on testnets
    // "avail-turing-testnet": [1],
    // "vara-testnet": [1],
    // "aleph-zero-testnet": [1],
  },
  documentation: {
    unifiedAddressDocsUrl:
      "https://polkadot-ux-bounty.notion.site/UXB-1-User-Wiki-Page-188e1c2781f380259c4ef29041bacc49",
  },
  // coinsApi: {
  //   apiUrl: "http://localhost:8787",
  // },
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

        // dev mode overrides
        if (DEBUG) {
          if (process.env.COINGECKO_API_URL) config.coingecko.apiUrl = process.env.COINGECKO_API_URL
          if (process.env.COINGECKO_API_KEY_NAME)
            config.coingecko.apiKeyName = process.env.COINGECKO_API_KEY_NAME
          if (process.env.COINGECKO_API_KEY_VALUE)
            config.coingecko.apiKeyValue = process.env.COINGECKO_API_KEY_VALUE
        }

        // as per 2.8.0 we dont want this address to be the default validator anymore.
        // versions prior to 2.8.0 expect a value there so GH config file cant be altered, we need to remove it at runtime
        config.stakingPools["bittensor"] = config.stakingPools["bittensor"]?.filter(
          (address) => address !== "5ELREhApbCahM7FyGLM1V9WDsnnjCRmMCJTmtQD51oAEqwVh",
        )

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
