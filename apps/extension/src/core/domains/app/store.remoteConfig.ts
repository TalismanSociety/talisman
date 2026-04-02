import { DEBUG, TEST } from "@common/constants"
import { log } from "@common/log"
import merge from "lodash-es/merge"

import { StorageProvider } from "../../libs/Store"
import { fetchRemoteConfig } from "./remote-config/fetchRemoteConfig"
import remoteConfigDefault from "./remoteConfig.default.json"
import type { RemoteConfigStoreData } from "./types"

const DEFAULT_REMOTE_CONFIG = remoteConfigDefault as RemoteConfigStoreData

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

  /** Reset store to build-time defaults. Call from onInstalled hook on install/upgrade. */
  async resetToDefaults() {
    try {
      log.debug("Resetting remote config to build-time defaults")
      await this.replace(DEFAULT_REMOTE_CONFIG)
    } catch (cause) {
      // non-critical, don't crash
      log.error("Failed to reset remote config to defaults", { cause })
    }
  }
}

export const remoteConfigStore = new RemoteConfigStore("remoteConfig", DEFAULT_REMOTE_CONFIG)
