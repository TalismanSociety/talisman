import { BALANCE_MODULES, BalanceTransferType } from "@talismn/balances"
import { ChainConnectorDot } from "@talismn/chain-connectors"
import { DotNetwork, isTokenDot, Token } from "@talismn/chaindata-provider"
import { ScaleApi } from "@talismn/sapi"
import { useQuery } from "@tanstack/react-query"
import { SignerPayloadJSON } from "extension-core"
import { log } from "extension-shared"
import { useEffect, useMemo, useState } from "react"

import { api } from "@ui/api"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useSubstrateDryRun } from "@ui/hooks/useSubstrateDryRun"
import { useTip } from "@ui/hooks/useTip"
import { useBalance, useNetworkById, useToken, useTokens } from "@ui/state"

import { useClaimWizard } from "../context/ClaimWizardContext"
import { useClaimTransaction } from "../hooks/useClaimTransaction"
import { mapYieldTokenToTokenId } from "../utils/tokenMapping"

// Helper functions (same as SendFunds and DepositFunds)
const usePayload = ({
  sapi,
  token,
  network,
  from,
  to,
  value = "0",
  method,
  tip,
  isLocked,
}: {
  sapi: ScaleApi | null | undefined
  token: Token | null | undefined
  network: DotNetwork | null | undefined
  from: string | undefined
  to: string | undefined
  value: string | undefined
  method: BalanceTransferType
  tip: string | undefined
  isLocked: boolean
}) => {
  return useQuery({
    queryKey: ["callData", token?.id, network?.id, from, to, value, sapi?.id, method, tip],
    queryFn: async () => {
      if (!token?.networkId || network?.platform !== "polkadot" || !from || !to || !sapi || !method)
        return null

      const mod = BALANCE_MODULES.find((mod) => mod.type === token.type)
      if (mod?.platform !== "polkadot") throw new Error(`Unsupported module type: ${mod?.type}`)

      const callData = await mod.getTransferCallData({
        from,
        to,
        value,
        token,
        metadataRpc: sapi.chain.metadataRpc,
        // ChainConnector is not available on front end.
        // getTransferCallData only uses the send method so we can mimic it safely
        connector: { send: api.subSend } as unknown as ChainConnectorDot,
        type: method,
        config: network.balancesConfig?.[mod.type],
      })

      const decodedCall = sapi.getDecodedCallFromPayload(callData)

      return sapi.getExtrinsicPayload(decodedCall.pallet, decodedCall.method, decodedCall.args, {
        address: from,
        tip: tip?.length ? BigInt(tip) : 0n,
      })
    },
    refetchInterval: false,
    enabled: !isLocked,
  })
}

const useEstimateFee = ({
  sapi,
  payload,
  isLocked,
}: {
  sapi: ScaleApi | null | undefined
  payload: SignerPayloadJSON | undefined
  isLocked: boolean
}) => {
  return useQuery({
    queryKey: ["estimateFee", sapi?.id, payload],
    queryFn: async () => {
      if (!sapi || !payload) return null

      const fee = await sapi.getFeeEstimate(payload)

      return { partialFee: fee.toString(), unsigned: payload }
    },
    refetchInterval: false,
    enabled: !isLocked,
  })
}

export const useClaimFundsTransactionDot = () => {
  const [isLocked, setIsLocked] = useState(false)
  const { account, balance: claimBalance } = useClaimWizard()
  const tokens = useTokens()

  // Get token ID from balance data using mapping function
  const tokenId = useMemo(() => {
    if (!claimBalance?.token || !tokens) return ""
    return (
      mapYieldTokenToTokenId(
        claimBalance.token.address || claimBalance.token.symbol,
        claimBalance.token.network,
        tokens,
      ) || ""
    )
  }, [claimBalance?.token, tokens])

  const token = useToken(tokenId) // Get token from mapped token ID
  const network = useNetworkById(token?.networkId, "polkadot")
  const userBalance = useBalance(account as string, tokenId)
  const tipToken = useToken(network?.nativeTokenId)

  // Get Yield.xyz transaction data
  const { allTransactions, isLoading: isYieldLoading, error: yieldError } = useClaimTransaction()

  // Standard Polkadot fee calculation hooks (same as SendFunds and DepositFunds)
  const qTip = useTip(token?.networkId, !isLocked)
  const qSapi = useScaleApi(token?.networkId)

  // For claims, we need to create a payload for the claim transaction
  // Since we don't have a specific amount for claims, we'll use a minimal value
  const qPayload = usePayload({
    sapi: qSapi?.data,
    token: token as Token,
    network: network as DotNetwork,
    from: account as string,
    to: account as string, // For claims, we're typically claiming to ourselves
    value: "0", // Claims don't have a transfer amount
    method: "keep-alive", // Standard for claims
    tip: qTip.data ?? "0",
    isLocked,
  })

  // Estimate fee using standard Polkadot approach
  const qEstimateFee = useEstimateFee({
    sapi: qSapi?.data,
    payload: qPayload.data?.payload,
    isLocked,
  })

  const qDryRun = useSubstrateDryRun(qPayload.data?.payload)

  useEffect(() => {
    if (qDryRun.data) log.debug("Dry run result", qDryRun.data)
    if (qDryRun.error) log.error("Dry run error", qDryRun.error)
  }, [qDryRun.data, qDryRun.error])

  // Calculate max amount using standard Polkadot approach
  const maxAmount = useMemo(() => {
    if (!userBalance || !isTokenDot(token) || qTip.isLoading) return null

    const tipPlanck = tipToken?.id === token.id ? BigInt(qTip.data ?? "0") : 0n

    switch (token.type) {
      case "substrate-native": {
        if (!qEstimateFee.data) return null
        const val =
          userBalance.transferable.planck - BigInt(qEstimateFee.data.partialFee) - tipPlanck
        return String(val > 0n ? val : 0n)
      }
      default:
        return userBalance.transferable.planck?.toString() ?? "0"
    }
  }, [userBalance, qEstimateFee.data, qTip, tipToken?.id, token])

  // Standard Polkadot fee calculation
  const estimatedFee = useMemo(
    () => (qEstimateFee.data ? qEstimateFee.data.partialFee.toString() : null),
    [qEstimateFee.data],
  )

  const [isLoading, isRefetching, error] = useMemo(() => {
    const queries = [qSapi, qTip, qPayload, qEstimateFee, qDryRun]
    const isLoading = queries.some((q) => q.isLoading)
    const isRefetching = queries.some((q) => q.isRefetching)
    const error = queries.map((q) => q.error).find((err) => !!err)
    return [isLoading, isRefetching, error]
  }, [qTip, qSapi, qPayload, qEstimateFee, qDryRun])

  if (!isTokenDot(token)) return null

  return {
    platform: "polkadot" as const,
    tx: qPayload.data?.payload,
    txDetails: {
      payload: qPayload.data?.payload,
      estimatedFee,
    },
    priority: null, // Polkadot doesn't use priority like Ethereum
    gasSettingsByPriority: null, // Not applicable for Polkadot
    setCustomSettings: () => {}, // Not applicable for Polkadot
    setPriority: () => {}, // Not applicable for Polkadot
    networkUsage: null, // Not applicable for Polkadot
    estimatedFee,
    maxFee: null, // Not applicable for Polkadot
    maxAmount,
    isLoading: isLoading || isYieldLoading,
    isRefetching,
    error: error || yieldError,
    isLocked,
    setIsLocked,

    // Yield API specific data for SequentialTransactionExecutor
    allTransactions: allTransactions,
    parsedTransactions: allTransactions
      .filter((tx) => tx.unsignedTransaction)
      .map((tx) => {
        try {
          const unsignedTx =
            typeof tx.unsignedTransaction === "string"
              ? JSON.parse(tx.unsignedTransaction)
              : tx.unsignedTransaction
          return unsignedTx
        } catch {
          return null
        }
      })
      .filter(Boolean),
  }
}
