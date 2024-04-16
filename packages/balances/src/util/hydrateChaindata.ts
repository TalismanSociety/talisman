import { EvmTokenFetcher, MiniMetadataUpdater } from "@talismn/balances"
import { ChaindataProvider } from "@talismn/chaindata-provider"

/** Pulls the latest chaindata from https://github.com/TalismanSociety/chaindata */
export const hydrateChaindataAndMiniMetadata = async (
  chaindataProvider: ChaindataProvider,
  miniMetadataUpdater: MiniMetadataUpdater
) => {
  await Promise.all([
    miniMetadataUpdater.hydrateFromChaindata(),
    miniMetadataUpdater.hydrateCustomChains(),
    chaindataProvider.hydrateChains(),
  ])

  const chains = await chaindataProvider.chains()
  const { statusesByChain } = await miniMetadataUpdater.statuses(chains)
  const goodChains = [...statusesByChain.entries()].flatMap(([chainId, status]) =>
    status === "good" ? chainId : []
  )
  await chaindataProvider.hydrateTokens(goodChains)
}

/** Builds any missing miniMetadatas (e.g. for the user's custom substrate chains) */
export const updateCustomMiniMetadata = async (
  chaindataProvider: ChaindataProvider,
  miniMetadataUpdater: MiniMetadataUpdater
) => {
  const chainIds = await chaindataProvider.chainIds()
  await miniMetadataUpdater.update(chainIds)
}

/** Fetches any missing Evm Tokens */
export const updateEvmTokens = async (
  chaindataProvider: ChaindataProvider,
  evmTokenFetcher: EvmTokenFetcher
) => {
  await chaindataProvider.hydrateEvmNetworks()
  const evmNetworkIds = await chaindataProvider.evmNetworkIds()
  await evmTokenFetcher.update(evmNetworkIds)
}
