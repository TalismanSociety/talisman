import { DEBUG, TALISMAN_CONFIG_URL } from "@core/constants"
import { StorageProvider } from "@core/libs/Store"
import { log } from "@core/log"
import { TokenId } from "@talismn/chaindata-provider"
import merge from "lodash/merge"
import toml from "toml"

import { FeatureVariants } from "./types"

export type RemoteConfigStoreData = {
  featureFlags: FeatureVariants
  buyTokens: {
    tokenIds: TokenId[]
  }
  coingecko: {
    apiUrl: string
    apiKeyName?: string
    apiKeyValue?: string
  }
}

const DEFAULT_CONFIG: RemoteConfigStoreData = {
  featureFlags: {},
  buyTokens: {
    tokenIds: [],
  },
  coingecko: {
    apiUrl: "https://api.coingecko.com",
  },
}

const CONFIG_TIMEOUT = 30 * 60 * 1000 // 30 minutes

const fetchConfig = async () => {
  log.debug("Fetching config.toml")
  const response = await fetch(TALISMAN_CONFIG_URL)

  if (!response.ok)
    throw new Error(`Unable to fetch config.toml: ${response.status} ${response.statusText}`)

  const text = await response.text()
  try {
    return merge(structuredClone(DEFAULT_CONFIG), toml.parse(text) as RemoteConfigStoreData)
  } catch (e) {
    throw new Error("Unable to parse config.toml", { cause: e })
  }
}

export class RemoteConfigStore extends StorageProvider<RemoteConfigStoreData> {
  // call this only once, and only from background script
  async init() {
    const updateConfig = async () => {
      try {
        const config = await fetchConfig()

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

        await this.mutate(() => config)
      } catch (err) {
        log.error("Unable to fetch config.toml", { cause: err })
      }
    }

    // await first update
    await updateConfig()

    // refresh periodically
    setInterval(updateConfig, CONFIG_TIMEOUT)
  }
}

export const remoteConfigStore = new RemoteConfigStore("remoteConfig", DEFAULT_CONFIG)
