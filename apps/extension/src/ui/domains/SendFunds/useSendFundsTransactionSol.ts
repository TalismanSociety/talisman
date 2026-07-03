import { isAccountOwned } from "@core/domains/keyring/exports"
import { BALANCE_MODULES } from "@talismn/balances"
import type { SolRpc } from "@talismn/chain-connectors"
import { isTokenSol, type Token } from "@talismn/chaindata-provider"
import { buildUnsignedTransaction, serializeTransaction } from "@talismn/solana"
import { useQuery } from "@tanstack/react-query"
import { useGetSolanaFeeEstimate } from "@ui/hooks/useGetSolanaFeeEstimate"
import { useAccountByAddress } from "@ui/state/accounts"
import { useBalance } from "@ui/state/balances"
import { useNetworkById, useToken } from "@ui/state/chaindata"
import { getFrontEndSolanaConnector, useSolanaRpc } from "@ui/util/solana/useSolanaRpc"
import { useMemo, useState } from "react"

import { useSolTransactionRiskAnalysis } from "../Sign/risk-analysis/solana/useSolTransactionRiskAnalysis"
import type { SendFundsTransactionProps } from "./types"

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

  const rpc = useSolanaRpc(token?.networkId)

  const qPayload = useSolPayload({ token, from, to, value, rpc })

  const qEstimatedFee = useGetSolanaFeeEstimate({
    networkId: token?.networkId,
    transaction: qPayload.data,
    refetchInterval: !isLocked && 6_000, // refresh fee every 6 seconds
  })

  const maxAmount = useMemo(() => {
    if (!balance || !isTokenSol(token)) return null

    switch (token.type) {
      case "sol-native": {
        if (qEstimatedFee.data == null) return null
        const val = balance.transferable.planck - qEstimatedFee.data
        return String(val > 0n ? val : 0n)
      }
      default:
        return balance.transferable.planck ? String(balance.transferable.planck) : "0"
    }
  }, [balance, token, qEstimatedFee.data])

  const serializedTx = useMemo(
    () => (qPayload.data ? serializeTransaction(qPayload.data) : null),
    [qPayload.data]
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
    estimatedFee: qEstimatedFee.data != null ? String(qEstimatedFee.data) : null,
    feeTokenId: feeToken?.id,
    riskAnalysis,

    setIsLocked,
  }
}

const useSolPayload = ({
  token,
  from,
  to,
  value,
  rpc,
}: {
  token: Token | null | undefined
  from: string | undefined
  to: string | undefined
  value: string
  rpc: SolRpc | null
}) => {
  return useQuery({
    queryKey: ["useSolPayload", token, from, to, value, token?.networkId],
    queryFn: async () => {
      if (!isTokenSol(token) || !from || !to || !value || !rpc) return null

      const mod = BALANCE_MODULES.find((mod) => mod.type === token.type)
      if (!mod) throw new Error(`Unsupported token type: ${token.type}`)
      if (mod.platform !== "solana") throw new Error(`Unsupported module type: ${mod.type}`)

      const connector = getFrontEndSolanaConnector(token.networkId)

      const instructions = await mod.getTransferCallData({ token, from, to, value, connector })

      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()

      return buildUnsignedTransaction({
        feePayer: from,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        instructions,
      })
    },
    refetchInterval: false, // it feels like we should refresh every 30 sec or so to get a fresh blockhash, but this would add loading states in the Confirm UI
  })
}
