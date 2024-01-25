import { balanceModules, chainConnectors } from "@core/rpcs/balance-modules"
import { chaindataProvider } from "@core/rpcs/chaindata"
import * as Sentry from "@sentry/browser"
import { MiniMetadataUpdater } from "@talismn/balances"

export const miniMetadataUpdater = new MiniMetadataUpdater(
  chainConnectors,
  chaindataProvider,
  balanceModules
)

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
        await hydrateChaindataAndMiniMetadata()
        await updateCustomMiniMetadata()
      } catch (cause) {
        Sentry.captureException(
          new Error("Failed to hydrate chaindata & update miniMetadata", { cause })
        )
      } finally {
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
    chaindataProvider.hydrateChains(),
    chaindataProvider.hydrateEvmNetworks(),
  ])

  const chains = await chaindataProvider.chainsArray()
  const { statusesByChain } = await miniMetadataUpdater.statuses(chains)
  const goodChains = [...statusesByChain.entries()].flatMap(([chainId, status]) =>
    status === "good" ? chainId : []
  )
  await chaindataProvider.hydrateTokens(goodChains)
}

/** Builds any missing miniMetadatas (e.g. for the user's custom substrate chains) */
const updateCustomMiniMetadata = async () => {
  const [chainIds, evmNetworkIds] = await Promise.all([
    chaindataProvider.chainIds(),
    chaindataProvider.evmNetworkIds(),
  ])

  await miniMetadataUpdater.update(chainIds, evmNetworkIds)
}
