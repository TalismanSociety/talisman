import { DEBUG, TEST } from "extension-shared"
import { log } from "extension-shared"
import merge from "lodash/merge"

import { StorageProvider } from "../../libs/Store"
import { fetchRemoteConfig } from "../../util/fetchRemoteConfig"
import { RemoteConfigStoreData } from "./types"

export const DEFAULT_REMOTE_CONFIG: RemoteConfigStoreData = {
  featureFlags: {},
  buyTokens: {
    tokenIds: [],
  },
  coingecko: {
    apiUrl: "https://api.coingecko.com",
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

        // dev mode overrides
        if (DEBUG) {
          if (process.env.COINGECKO_API_URL) config.coingecko.apiUrl = process.env.COINGECKO_API_URL
          if (process.env.COINGECKO_API_KEY_NAME)
            config.coingecko.apiKeyName = process.env.COINGECKO_API_KEY_NAME
          if (process.env.COINGECKO_API_KEY_VALUE)
            config.coingecko.apiKeyValue = process.env.COINGECKO_API_KEY_VALUE
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
