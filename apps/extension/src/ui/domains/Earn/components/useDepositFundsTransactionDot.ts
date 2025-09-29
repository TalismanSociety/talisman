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
import { useBalance, useNetworkById, useToken } from "@ui/state"

import { useDepositWizard } from "../context/DepositWizardContext"
import { useYieldTransaction } from "../hooks/useYieldTransaction"

export const useDepositFundsTransactionDot = () => {
  const [isLocked, setIsLocked] = useState(false)
  const { account, tokenId, amount, depositMax } = useDepositWizard()
  const token = useToken(tokenId)
  const network = useNetworkById(token?.networkId, "polkadot")
  const balance = useBalance(account as string, tokenId as string)
  const _feeToken = useToken(network?.nativeTokenId)
  const tipToken = useToken(network?.nativeTokenId)

  // Get real transaction data from Yield.xyz API
  const {
    transaction: yieldTransaction,
    maxAmount: yieldMaxAmount,
    isLoading: isYieldLoading,
    error: yieldError,
    allTransactions,
  } = useYieldTransaction()

  // Native Polkadot transaction handling (fallback)
  const qTip = useTip(token?.networkId, !isLocked)
  const qSapi = useScaleApi(token?.networkId)

  // For Yield.xyz transactions, we need to determine the target address
  // This comes from the parsed unsignedTransaction JSON of the first transaction
  const yieldTargetAddress = useMemo(() => {
    const firstTransaction = allTransactions[0]
    if (firstTransaction?.unsignedTransaction) {
      try {
        const parsedTx = JSON.parse(firstTransaction.unsignedTransaction)
        log.debug("Parsed Yield.xyz transaction:", parsedTx)

        // The target address should be in the transaction data
        // For Polkadot staking, it's typically the validator address
        const targetAddress = parsedTx.tx?.address || parsedTx.address || null
        log.debug("Extracted target address:", targetAddress)
        return typeof targetAddress === "string" ? targetAddress : null
      } catch (error) {
        log.error("Failed to parse Yield.xyz transaction:", error)
        return null
      }
    }
    return null
  }, [allTransactions])

  // Use a valid target address or null - no placeholders!
  const targetAddress: string | null = yieldTargetAddress || null

  // Debug logging
  useEffect(() => {
    const firstTransaction = allTransactions[0]
    if (firstTransaction) {
      log.debug("Yield.xyz transaction:", firstTransaction)
      log.debug("Target address being used:", targetAddress)
    }
  }, [allTransactions, targetAddress])

  const qPayload = usePayload({
    sapi: qSapi?.data,
    token: token as Token,
    network: network as DotNetwork,
    from: account as string,
    to: targetAddress || undefined, // Pass undefined instead of null
    value: amount || "0",
    method: depositMax ? "all" : "keep-alive",
    tip: qTip.data ?? "0",
    isLocked,
  })

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

  // Calculate max amount
  const maxAmount = useMemo(() => {
    // Use Yield.xyz max amount if available
    if (yieldMaxAmount) {
      return yieldMaxAmount
    }

    // Fallback to balance-based calculation
    if (!balance || !isTokenDot(token) || qTip.isLoading) return null

    const tipPlanck = tipToken?.id === token.id ? BigInt(qTip.data ?? "0") : 0n

    switch (token.type) {
      case "substrate-native": {
        if (!qEstimateFee.data) return null
        const val = balance.transferable.planck - BigInt(qEstimateFee.data.partialFee) - tipPlanck
        return String(val > 0n ? val : 0n)
      }
      default:
        return balance.transferable.planck?.toString() ?? "0"
    }
  }, [yieldMaxAmount, balance, qEstimateFee.data, qTip, tipToken?.id, token])

  const estimatedFee = useMemo(
    () => (qEstimateFee.data ? qEstimateFee.data.partialFee.toString() : null),
    [qEstimateFee.data],
  )

  const [isLoading, _isRefetching, error] = useMemo(() => {
    const queries = [qSapi, qTip, qPayload, qEstimateFee, qDryRun]

    const isLoading = queries.some((q) => q.isLoading) || isYieldLoading
    const _isRefetching = queries.some((q) => q.isRefetching)
    const error = queries.map((q) => q.error).find((err) => !!err) || yieldError

    return [isLoading, _isRefetching, error]
  }, [qTip, qSapi, qPayload, qEstimateFee, qDryRun, isYieldLoading, yieldError])

  if (!isTokenDot(token)) return null

  // CRITICAL: Never proceed without a valid target address
  if (!targetAddress) {
    log.error("No valid target address found for Polkadot transaction - cannot proceed")
    return null
  }

  return {
    platform: "polkadot" as const,
    tx: qPayload.data?.payload,
    txDetails: {
      payload: qPayload.data?.payload,
      shortMetadata: qPayload.data?.shortMetadata,
      dryRun: qDryRun.data,
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
    isLoading,
    error,
    isLocked,
    setIsLocked,

    // Yield.xyz specific data
    yieldTransaction: allTransactions[0] || null,
    isYieldTransaction: !!yieldTransaction,
  }
}

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
