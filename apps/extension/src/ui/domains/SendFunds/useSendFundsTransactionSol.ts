import { Connection, PublicKey, Transaction } from "@solana/web3.js"
import { BALANCE_MODULES } from "@talismn/balances"
import { isTokenSol, Token } from "@talismn/chaindata-provider"
import { serializeTransaction } from "@talismn/solana"
import { useQuery } from "@tanstack/react-query"
import { isAccountOwned } from "extension-core"
import { useMemo, useState } from "react"

import { useAccountByAddress, useBalance, useNetworkById, useToken } from "@ui/state"
import {
  getFrontEndSolanaConnector,
  useSolanaConnection,
} from "@ui/util/solana/useSolanaConnection"

import { useSolTransactionRiskAnalysis } from "../Sign/risk-analysis/solana/useSolTransactionRiskAnalysis"
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

  const serializedTx = useMemo(
    () => (qPayload.data ? serializeTransaction(qPayload.data) : null),
    [qPayload.data],
  )

  // force a risk analysis scan if the account isnt owned
  const targetAccount = useAccountByAddress(to)
  const isScanRequired = useMemo(() => !!to && !isAccountOwned(targetAccount), [targetAccount, to])

  const riskAnalysis = useSolTransactionRiskAnalysis({
    from,
    networkId: token?.networkId,
    tx: serializedTx,
    disableAutoRiskScan: !isScanRequired,
    disableCriticalPane: true,
  })

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
    riskAnalysis,

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
      if (mod.platform !== "solana") throw new Error(`Unsupported module type: ${mod.type}`)

      const connector = getFrontEndSolanaConnector(token.networkId)

      const instructions = await mod.getTransferCallData({ token, from, to, value, connector })

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()

      const tx = new Transaction().add(...instructions)
      tx.feePayer = new PublicKey(from)
      tx.recentBlockhash = blockhash
      tx.lastValidBlockHeight = lastValidBlockHeight

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
    queryKey: ["useSendFundsSolEstimateFee", transaction, connection?.rpcEndpoint],
    queryFn: async () => {
      if (!transaction || !connection?.rpcEndpoint) return null

      const result = await connection.getFeeForMessage(transaction.compileMessage())
      return result.value ? String(result.value) : null
    },
    refetchInterval: !isLocked && 6_000, // refresh fee every 60 seconds
  })
}
