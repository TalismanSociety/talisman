import { serializeTransactionRequest } from "extension-core"
import { useCallback } from "react"
import { TransactionRequest } from "viem"

import { api } from "@ui/api"
import { useAccountByAddress } from "@ui/state"

// Type for Yield.xyz transactions which have numeric type
type _YieldTransactionRequest = Omit<TransactionRequest, "type"> & {
  type: number
}

export const useWalletIntegration = (accountAddress?: string, networkId?: string) => {
  const account = useAccountByAddress(accountAddress)

  const signTransaction = useCallback(
    async (tx: unknown) => {
      if (!account) {
        throw new Error("No account available for signing")
      }

      if (account.type === "watch-only") {
        throw new Error("Cannot sign transactions with a watched account")
      }

      if (!networkId) {
        throw new Error("Network ID is required for signing")
      }

      // Convert network name to chain ID
      let chainId = networkId
      if (networkId === "ethereum") {
        chainId = "1" // Ethereum mainnet
      } else if (networkId === "polygon") {
        chainId = "137" // Polygon mainnet
      } else if (networkId === "arbitrum") {
        chainId = "42161" // Arbitrum One
      } else if (networkId === "optimism") {
        chainId = "10" // Optimism
      }

      // Convert numeric type to string type for Talisman
      let convertedTx: TransactionRequest

      // Check if transaction already has string type (already converted)
      if (typeof (tx as Record<string, unknown>).type === "string") {
        convertedTx = tx as TransactionRequest
      } else {
        // Convert numeric type to string type
        const { type: numericType, ...txWithoutType } = tx as Record<string, unknown>

        if (numericType === 2) {
          // EIP-1559 transaction
          convertedTx = {
            ...txWithoutType,
            type: "eip1559",
          } as TransactionRequest
        } else if (numericType === 1) {
          // EIP-2930 transaction - remove EIP-1559 gas fields
          const {
            maxFeePerGas: _maxFeePerGas,
            maxPriorityFeePerGas: _maxPriorityFeePerGas,
            ...txWithoutEip1559
          } = txWithoutType
          convertedTx = {
            ...txWithoutEip1559,
            type: "eip2930",
          } as TransactionRequest
        } else if (numericType === 0) {
          // Legacy transaction - remove EIP-1559 gas fields
          const {
            maxFeePerGas: _maxFeePerGas,
            maxPriorityFeePerGas: _maxPriorityFeePerGas,
            ...txWithoutEip1559
          } = txWithoutType
          convertedTx = {
            ...txWithoutEip1559,
            type: "legacy",
          } as TransactionRequest
        } else {
          // Default to legacy
          convertedTx = {
            ...txWithoutType,
            type: "legacy",
          } as TransactionRequest
        }
      }

      // Serialize the transaction request
      const serialized = serializeTransactionRequest(convertedTx)
      if (!serialized) {
        throw new Error("Failed to serialize transaction request")
      }

      // Use the existing API to sign and send the transaction
      const hash = await api.ethSignAndSend(chainId, serialized, {
        type: "transfer",
        tokenId: "1", // Default to ETH token ID - this should be determined from the transaction
        value: (tx as Record<string, unknown>).value?.toString() || "0",
        to: String((tx as Record<string, unknown>).to || ""),
      })

      return { hash }
    },
    [account, networkId],
  )

  const broadcastTransaction = useCallback(async (signedTransaction: { hash: string }) => {
    // The transaction is already broadcasted by ethSignAndSend
    // Just return the hash
    return { hash: signedTransaction.hash }
  }, [])

  return {
    signTransaction,
    broadcastTransaction,
    canSign: account?.type !== "watch-only",
  }
}
