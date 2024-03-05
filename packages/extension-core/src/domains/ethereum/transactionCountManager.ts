import { chainConnectorEvm } from "../../rpcs/chain-connector-evm"
import { EvmNetworkId } from "./types"

const dicTransactionCount = new Map<string, number>()

const getKey = (address: string, evmNetworkId: EvmNetworkId) =>
  `${address}-${evmNetworkId}`.toLowerCase()

/*
  To be called to set a valid nonce for a transaction
*/
export const getTransactionCount = async (address: `0x${string}`, evmNetworkId: EvmNetworkId) => {
  const key = getKey(address, evmNetworkId)

  const provider = await chainConnectorEvm.getPublicClientForEvmNetwork(evmNetworkId)
  if (!provider) throw new Error(`Could not find provider for EVM chain ${evmNetworkId}`)

  const transactionCount = await provider.getTransactionCount({ address })

  if (!dicTransactionCount.has(key)) {
    // initial value
    dicTransactionCount.set(key, transactionCount)
  } else {
    // dictionary may be "late" is same address is used on 2 browsers or computers
    const current = dicTransactionCount.get(key) as number
    if (transactionCount > current) dicTransactionCount.set(key, transactionCount)
  }

  return dicTransactionCount.get(key) as number
}

/*
  To be called each time a transaction is submitted to blockchain
*/
export const incrementTransactionCount = (address: string, evmNetworkId: EvmNetworkId) => {
  const key = getKey(address, evmNetworkId)

  const count = dicTransactionCount.get(key)
  if (count === undefined)
    throw new Error(`Missing transaction count for ${address} on network ${evmNetworkId}`)

  dicTransactionCount.set(key, count + 1)
}

export const resetTransactionCount = (address: string, evmNetworkId: EvmNetworkId) => {
  const key = getKey(address, evmNetworkId)
  dicTransactionCount.delete(key)
}
