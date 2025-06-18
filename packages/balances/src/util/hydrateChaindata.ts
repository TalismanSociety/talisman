// import { EvmTokenFetcher,  } from "@talismn/balances"
// import { ChaindataProvider } from "@talismn/chaindata-provider"

// import log from "../log"

// /** Pulls the latest chaindata from https://github.com/TalismanSociety/chaindata */
// /** @deprecated */
// export const hydrateChaindataAndMiniMetadata = async (
//   // _chaindataProvider: ChaindataProvider,
//   // _miniMetadataUpdater: MiniMetadataUpdater,
// ) => {
//   log.warn("hydrateChaindataAndMiniMetadata is deprecated")
//   // need chains to be provisioned first, or substrate balances won't fetch on first subscription
//   // await chaindataProvider.hydrate()
//   // await Promise.all([
//   //   miniMetadataUpdater.hydrateFromChaindata(),
//   //   miniMetadataUpdater.hydrateCustomChains(),
//   // ])
//   // const chains = await chaindataProvider.chains()
//   // const { statusesByChain } = await miniMetadataUpdater.statuses(chains)
//   // const goodChains = [...statusesByChain.entries()].flatMap(([chainId, status]) =>
//   //   status === "good" ? chainId : [],
//   // )
//   // await chaindataProvider.hydrateSubstrateTokens(goodChains)
// }

// /** Builds any missing miniMetadatas (e.g. for the user's custom substrate chains) */
// /** @deprecated */
// export const updateCustomMiniMetadata = async (
//   _chaindataProvider: ChaindataProvider,
//   _miniMetadataUpdater: MiniMetadataUpdater,
// ) => {
//   log.warn("updateCustomMiniMetadata is deprecated")
//   // const chainIds = await chaindataProvider.chainIds()
//   // await miniMetadataUpdater.update(chainIds)
// }

// /** Fetches any missing Evm Tokens */
// /** @deprecated */
// export const updateEvmTokens = async (
//   _chaindataProvider: ChaindataProvider,
//   _evmTokenFetcher: EvmTokenFetcher,
// ) => {
//   log.warn("updateEvmTokens is deprecated")
//   // await chaindataProvider.hydrate()
//   // const evmNetworkIds = await chaindataProvider.evmNetworkIds()
//   // await evmTokenFetcher.update(evmNetworkIds)
// }
