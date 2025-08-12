import { Transaction } from "dexie"

import { Token, TokenId } from "../chaindata"
import { LegacyChain, LegacyChainId } from "../legacy/Chain"
import { LegacyEvmNetwork, LegacyEvmNetworkId } from "../legacy/EvmNetwork"

const legacySubNativeTokenId = (chainId: LegacyChainId) =>
  `${chainId}-substrate-native`.toLowerCase().replace(/ /g, "-")

const legacyEvmNativeTokenId = (chainId: LegacyEvmNetworkId) =>
  `${chainId}-evm-native`.toLowerCase().replace(/ /g, "-")

// for DB version 2, Wallet version 1.21.0
export const upgradeRemoveSymbolFromNativeTokenId = async (tx: Transaction) => {
  const tokensTable = tx.table<Token, TokenId>("tokens")
  const chainsTable = tx.table<LegacyChain, LegacyChainId>("chains")
  const evmNetworksTable = tx.table<LegacyEvmNetwork, LegacyEvmNetworkId>("evmNetworks")

  const nativeTokens = (await tokensTable.toArray()).filter((t) =>
    ["substrate-native", "evm-native"].includes(t.type),
  )
  const chains = await chainsTable.toArray()
  const evmNetworks = await evmNetworksTable.toArray()

  const tokenIdsToDelete: TokenId[] = []
  const tokensToUpsert: Token[] = []
  const chainsToUpsert: LegacyChain[] = []
  const evmNetworksToUpsert: LegacyEvmNetwork[] = []

  for (const nativeToken of nativeTokens) {
    const networkId = nativeToken.networkId || nativeToken.networkId
    if (!networkId) continue

    const id =
      nativeToken.type === "substrate-native"
        ? legacySubNativeTokenId(networkId)
        : nativeToken.type === "evm-native"
          ? legacyEvmNativeTokenId(networkId)
          : undefined
    if (!id) continue

    const chain = chains.find(({ id }) => id === networkId)
    const evmNetwork = evmNetworks.find(({ id }) => id === networkId)

    tokenIdsToDelete.push(nativeToken.id)
    tokensToUpsert.push({ ...nativeToken, id })
    if (chain) chainsToUpsert.push({ ...chain, nativeToken: { id } })
    if (evmNetwork) evmNetworksToUpsert.push({ ...evmNetwork, nativeToken: { id } })
  }

  await tokensTable.bulkPut(tokensToUpsert)
  await chainsTable.bulkPut(chainsToUpsert)
  await evmNetworksTable.bulkPut(evmNetworksToUpsert)
  await tokensTable.bulkDelete(tokenIdsToDelete)
}
