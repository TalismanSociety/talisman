import { Transaction } from "dexie"

import { Chain, ChainId, EvmNetwork, EvmNetworkId, Token, TokenId } from "../types"

const subNativeTokenId = (chainId: ChainId) =>
  `${chainId}-substrate-native`.toLowerCase().replace(/ /g, "-")

const evmNativeTokenId = (chainId: EvmNetworkId) =>
  `${chainId}-evm-native`.toLowerCase().replace(/ /g, "-")

// for DB version 2, Wallet version 1.21.0
export const upgradeRemoveSymbolFromNativeTokenId = async (tx: Transaction) => {
  const tokensTable = tx.table<Token, TokenId>("tokens")
  const chainsTable = tx.table<Chain, ChainId>("chains")
  const evmNetworksTable = tx.table<EvmNetwork, EvmNetworkId>("evmNetworks")

  const nativeTokens = (await tokensTable.toArray()).filter((t) =>
    ["substrate-native", "evm-native"].includes(t.type)
  )
  const chains = await chainsTable.toArray()
  const evmNetworks = await evmNetworksTable.toArray()

  const tokenIdsToDelete: TokenId[] = []
  const tokensToUpsert: Token[] = []
  const chainsToUpsert: Chain[] = []
  const evmNetworksToUpsert: EvmNetwork[] = []

  for (const nativeToken of nativeTokens) {
    const networkId = nativeToken.chain?.id || nativeToken.evmNetwork?.id
    if (!networkId) continue

    const id =
      nativeToken.type === "substrate-native"
        ? subNativeTokenId(networkId)
        : nativeToken.type === "evm-native"
        ? evmNativeTokenId(networkId)
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
