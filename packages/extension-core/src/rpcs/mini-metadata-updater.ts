import keyring from "@polkadot/ui-keyring"
import * as Sentry from "@sentry/browser"
import {
  EvmTokenFetcher,
  MiniMetadataUpdater,
  hydrateChaindataAndMiniMetadata,
  updateCustomMiniMetadata,
  updateEvmTokens,
} from "@talismn/balances"
import { TEST } from "extension-shared"

import { awaitKeyringLoaded } from "../util/awaitKeyringLoaded"
import { balanceModules, chainConnectors } from "./balance-modules"
import { chaindataProvider } from "./chaindata"

const miniMetadataUpdater = new MiniMetadataUpdater(
  chainConnectors,
  chaindataProvider,
  balanceModules
)
const evmTokenFetcher = new EvmTokenFetcher(chaindataProvider, balanceModules)

/**
 * Hydrates miniMetadatas and chaindata, then updates miniMetadatas for any custom substrate chains.
 *
 * When called many times in parallel, will only update once.
 */
export const updateAndWaitForUpdatedChaindata = (): Promise<void> => {
  if (activeUpdate) return activeUpdate

  activeUpdate = new Promise((resolve) => {
    ;(async () => {
      try {
        // run these two promises in parallel, but we only care about the result of the first one
        const [userHasSubstrateAccounts] = await Promise.all([
          awaitKeyringLoaded()
            .then(() => keyring.getAccounts().filter((account) => account.meta.type !== "ethereum"))
            .then((substrateAccounts) => substrateAccounts.length > 0),
          hydrateChaindataAndMiniMetadata(chaindataProvider, miniMetadataUpdater),
        ])

        if (
          // Don't update custom miniMetadatas unless user has some substrate accounts
          // They can take a while to update, and ethereum-only users will never need them.
          userHasSubstrateAccounts &&
          // Don't update custom miniMetadatas in tests.
          // We'll be using the init data for chaindata, and we don't have a mock for the `state_getMetadata`
          // ws rpc call which will be invoked if there are any missing miniMetadatas in the init data.
          !TEST
        )
          await updateCustomMiniMetadata(chaindataProvider, miniMetadataUpdater)
        await updateEvmTokens(chaindataProvider, evmTokenFetcher)
      } catch (cause) {
        Sentry.captureException(
          new Error("Failed to hydrate chaindata & update miniMetadata", { cause })
        )
      } finally {
        activeUpdate = null
        resolve()
      }
    })()
  })

  return activeUpdate
}
let activeUpdate: Promise<void> | null = null
