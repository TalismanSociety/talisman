import {
  Chain,
  ChainId,
  EvmNetwork,
  EvmNetworkId,
  Token,
  TokenId,
} from "@talismn/chaindata-provider"
import { Transaction } from "dexie"

// for DB version 2, Wallet version 1.21.0
export const upgradeRemoveSymbolFromNativeTokenId = async (tx: Transaction) => {
  const tokensTable = tx.table<Token, TokenId>("tokens")
  const chainsTable = tx.table<Chain, ChainId>("chains")
  const evmNetworksTable = tx.table<EvmNetwork, EvmNetworkId>("evmNetworks")

  const customTokens = await tokensTable.toArray()
  const customChains = await chainsTable.toArray()
  const customEvmNetworks = await evmNetworksTable.toArray()

  const tokenIdsToDelete: TokenId[] = []
  const tokensToUpsert: Token[] = []
  const chainsToUpsert: Chain[] = []
  const evmNetworksToUpsert: EvmNetwork[] = []

  for (const customNativeToken of customTokens.filter(
    (t) => "isCustom" in t && !!t.isCustom && ["substrate-native", "evm-native"].includes(t.type)
  )) {
    const networkId = customNativeToken.chain?.id || customNativeToken.evmNetwork?.id
    if (!networkId) continue

    const chain = customChains.find(({ id }) => id === networkId)
    const evmNetwork = customEvmNetworks.find(({ id }) => id === networkId)

    tokenIdsToDelete.push(customNativeToken.id)
    tokensToUpsert.push({
      ...customNativeToken,
      id: `${networkId}-${customNativeToken.type}`,
    })
    if (chain) {
      chainsToUpsert.push({
        ...chain,
        nativeToken: { id: `${networkId}-${customNativeToken.type}` },
      })
    }
    if (evmNetwork) {
      evmNetworksToUpsert.push({
        ...evmNetwork,
        nativeToken: { id: `${networkId}-${customNativeToken.type}` },
      })
    }
  }

  await tokensTable.bulkPut(tokensToUpsert)
  await chainsTable.bulkPut(chainsToUpsert)
  await evmNetworksTable.bulkPut(evmNetworksToUpsert)
  await tokensTable.bulkDelete(tokenIdsToDelete)
}
