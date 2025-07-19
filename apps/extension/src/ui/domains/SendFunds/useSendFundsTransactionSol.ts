import { Connection, PublicKey, Transaction } from "@solana/web3.js"
import { BALANCE_MODULES } from "@talismn/balances"
import { isTokenSol, Token } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"

import { useBalance, useNetworkById, useToken } from "@ui/state"
import { useSolanaConnection } from "@ui/util/solana/useSolanaConnection"

import { SendFundsTransactionProps } from "./types"

export const useSendFundsTransactionSol = ({
  tokenId,
  from,
  to,
  value = "0", // default to "0" to force fee estimation
}: SendFundsTransactionProps) => {
  const [isLocked, setIsLocked] = useState(false)
  const token = useToken(tokenId)
  const network = useNetworkById(token?.networkId, "ethereum")
  const feeToken = useToken(network?.nativeTokenId)
  const balance = useBalance(from as string, tokenId as string)

  const connection = useSolanaConnection(token?.networkId)

  const qPayload = useSolPayload({ token, from, to, value, connection })

  const qEstimatedFee = useEstimatedFee({
    transaction: qPayload.data,
    connection,
    isLocked,
  })

  const maxAmount = useMemo(() => {
    if (!balance || !isTokenSol(token)) return null

    switch (token.type) {
      case "sol-native": {
        if (!qEstimatedFee.data) return null
        const val = balance.transferable.planck - BigInt(qEstimatedFee.data)
        return String(val > 0n ? val : 0n)
      }
      default:
        return balance.transferable.planck ? String(balance.transferable.planck) : "0"
    }
  }, [balance, token, qEstimatedFee.data])

  if (!isTokenSol(token)) return null

  return {
    platform: "solana" as const,

    tx: qPayload.data, // prevents naming conflicts for consumers
    isLoading: qPayload.isLoading || qEstimatedFee.isLoading,
    isRefetching: qPayload.isRefetching || qEstimatedFee.isRefetching,
    error: qPayload.error || qEstimatedFee.error,

    maxAmount,
    estimatedFee: qEstimatedFee.data ? String(qEstimatedFee.data) : null,

    feeTokenId: feeToken?.id,

    setIsLocked,
  }
}

export type SendFundsTransactionSol = ReturnType<typeof useSendFundsTransactionSol>

const useSolPayload = ({
  token,
  from,
  to,
  value,
  connection,
}: {
  token: Token | null | undefined
  from: string | undefined
  to: string | undefined
  value: string
  connection: Connection | null
}) => {
  return useQuery({
    queryKey: ["useSolPayload", token, from, to, value, connection?.rpcEndpoint],
    queryFn: async () => {
      if (!isTokenSol(token) || !from || !to || !value || !connection?.rpcEndpoint) return null

      const mod = BALANCE_MODULES.find((mod) => mod.type === token.type)
      if (!mod) throw new Error(`Unsupported token type: ${token.type}`)

      const calldata = await mod.getTransferCallData({ token, from, to, value })

      const { blockhash } = await connection.getLatestBlockhash()

      const tx = new Transaction().add(calldata)
      tx.feePayer = new PublicKey(from)
      tx.recentBlockhash = blockhash

      return tx
    },
    refetchInterval: false, // it feels like we should refresh every 30 sec or so to get a fresh blockhash, but this would add loading states in the Confirm UI
  })
}

const useEstimatedFee = ({
  transaction,
  connection,
  isLocked,
}: {
  transaction: Transaction | null | undefined
  connection: Connection | null
  isLocked: boolean
}) => {
  return useQuery({
    queryKey: ["useEstimateFee", transaction, connection?.rpcEndpoint],
    queryFn: async () => {
      if (!transaction || !connection?.rpcEndpoint) return null

      const feeCalculator = await connection.getFeeForMessage(transaction.compileMessage())
      return feeCalculator.value ? String(feeCalculator.value) : null
    },
    refetchInterval: !isLocked && 6_000, // refresh fee every 60 seconds
  })
}
