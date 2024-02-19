import { Transaction } from "dexie"

import { Chain, ChainId, EvmNetwork, EvmNetworkId, Token, TokenId } from "../types"

// for DB version 2, Wallet version 1.21.0
export const upgradeAddIsDefaultToExistingChains = async (tx: Transaction) => {
  const chainsTable = tx.table<Chain, ChainId>("chains")
  const evmNetworksTable = tx.table<EvmNetwork, EvmNetworkId>("evmNetworks")
  const tokensTable = tx.table<Token, TokenId>("tokens")

  await chainsTable.toCollection().modify((chain) => {
    if ("isCustom" in chain && chain.isCustom) return
    chain.isDefault = true
  })
  await evmNetworksTable.toCollection().modify((evmNetwork) => {
    if ("isCustom" in evmNetwork && evmNetwork.isCustom) return
    evmNetwork.isDefault = true
  })
  await tokensTable.toCollection().modify((token) => {
    if ("isCustom" in token && token.isCustom) return
    token.isDefault = true
  })
}
