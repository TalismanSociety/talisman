import * as Sentry from "@sentry/browser"
import {
  EvmTokenFetcher,
  MiniMetadataUpdater,
  hydrateChaindataAndMiniMetadata,
  updateCustomMiniMetadata,
  updateEvmTokens,
} from "@talismn/balances"
import { TEST } from "extension-shared"

import { balanceModules, chainConnectors } from "./balance-modules"
import { chaindataProvider } from "./chaindata"

const miniMetadataUpdater = new MiniMetadataUpdater(
  chainConnectors,
  chaindataProvider,
  balanceModules
)
const evmTokenFetcher = new EvmTokenFetcher(chaindataProvider, balanceModules)

/**
 * Hydrates miniMetadatas and chaindata, then updates miniMetadatas for any custom substrate chains if requested.
 *
 * When called many times in parallel, will only update mini metadata only once.
 */
export const updateAndWaitForUpdatedChaindata = async (updateMiniMetadata: boolean) => {
  try {
    await Promise.all([
      hydrateChaindataAndMiniMetadata(chaindataProvider, miniMetadataUpdater),
      updateEvmTokens(chaindataProvider, evmTokenFetcher),
    ])

    if (updateMiniMetadata && !TEST) {
      if (!activeUpdate)
        activeUpdate = updateCustomMiniMetadata(chaindataProvider, miniMetadataUpdater)

      try {
        await activeUpdate
      } finally {
        activeUpdate = null
      }
    }
  } catch (cause) {
    Sentry.captureException(
      new Error("Failed to hydrate chaindata & update miniMetadata", { cause })
    )
  }
}
let activeUpdate: Promise<void> | null = null
