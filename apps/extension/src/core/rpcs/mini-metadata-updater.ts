import { TEST } from "@core/constants"
import { balanceModules, chainConnectors } from "@core/rpcs/balance-modules"
import { chaindataProvider } from "@core/rpcs/chaindata"
import { awaitKeyringLoaded } from "@core/util/awaitKeyringLoaded"
import keyring from "@polkadot/ui-keyring"
import * as Sentry from "@sentry/browser"
import { EvmTokenFetcher, MiniMetadataUpdater } from "@talismn/balances"

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
          hydrateChaindataAndMiniMetadata(),
        ])

        if (userHasSubstrateAccounts) await updateCustomMiniMetadata()
        await updateEvmTokens()
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

/** Pulls the latest chaindata from https://github.com/TalismanSociety/chaindata */
const hydrateChaindataAndMiniMetadata = async () => {
  await Promise.all([
    miniMetadataUpdater.hydrateFromChaindata(),
    miniMetadataUpdater.hydrateCustomChains(),
    chaindataProvider.hydrateChains(),
    chaindataProvider.hydrateEvmNetworks(),
  ])

  const chains = await chaindataProvider.chains()
  const { statusesByChain } = await miniMetadataUpdater.statuses(chains)
  const goodChains = [...statusesByChain.entries()].flatMap(([chainId, status]) =>
    status === "good" ? chainId : []
  )
  await chaindataProvider.hydrateTokens(goodChains)
}

/** Builds any missing miniMetadatas (e.g. for the user's custom substrate chains) */
const updateCustomMiniMetadata = async () => {
  // Don't update custom minimetadata in tests
  //
  // TODO: Remove this, and instead mock the websocket response for all of the called rpc methods.
  // E.g. state_getMetadata, system_properties, etc
  if (TEST) return

  const chainIds = await chaindataProvider.chainIds()
  await miniMetadataUpdater.update(chainIds)
}

/** Fetches any missing Evm Tokens */
const updateEvmTokens = async () => {
  const evmNetworkIds = await chaindataProvider.evmNetworkIds()
  await evmTokenFetcher.update(evmNetworkIds)
}
