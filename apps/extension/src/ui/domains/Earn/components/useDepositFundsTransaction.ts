import { isTokenEth } from "@talismn/chaindata-provider"
import { isEthereumAddress } from "@talismn/crypto"
import { useMemo, useState } from "react"

import { useEthTransaction } from "@ui/domains/Ethereum/useEthTransaction"
import { useBalance, useNetworkById, useToken } from "@ui/state"

import { useDepositWizard } from "../context/DepositWizardContext"
import { useYieldTransaction } from "../hooks/useYieldTransaction"

export const useDepositFundsTransaction = () => {
  const [isLocked, setIsLocked] = useState(false)
  const { account, tokenId } = useDepositWizard()
  const token = useToken(tokenId)
  const network = useNetworkById(token?.networkId, "ethereum")
  const _feeToken = useToken(network?.nativeTokenId)
  const balance = useBalance(account as string, tokenId as string)

  // Get real transaction data from Yield.xyz API
  const {
    transaction: yieldTransaction,
    maxAmount: yieldMaxAmount,
    isLoading: isYieldLoading,
    error: yieldError,
    primaryTransaction,
  } = useYieldTransaction()

  // Use Yield.xyz transaction data only
  const [tx, error] = useMemo(() => {
    if (
      !isTokenEth(token) ||
      !token.networkId ||
      !token ||
      !account ||
      !isEthereumAddress(account)
    ) {
      return [undefined, undefined]
    }

    if (yieldTransaction) {
      return [yieldTransaction, yieldError]
    }

    // No fallback - return undefined if no Yield.xyz data
    return [undefined, yieldError]
  }, [account, token, yieldTransaction, yieldError])

  const result = useEthTransaction(tx, token?.networkId, isLocked, false)

  const maxAmount = useMemo(() => {
    // Use Yield.xyz max amount if available
    if (yieldMaxAmount) {
      return yieldMaxAmount
    }

    // Fallback to balance-based calculation
    if (!balance || !isTokenEth(token) || !result.txDetails?.estimatedFee) return null

    // For deposits, max amount is balance minus estimated fee
    const val = balance.transferable.planck - BigInt(result.txDetails.estimatedFee)
    return String(val > 0n ? val : 0n)
  }, [yieldMaxAmount, balance, token, result.txDetails?.estimatedFee])

  if (!isTokenEth(token)) return null

  return {
    platform: "ethereum" as const,
    tx: result.transaction,
    txDetails: result.txDetails,
    priority: result.priority,
    gasSettingsByPriority: result.gasSettingsByPriority,
    setCustomSettings: result.setCustomSettings,
    setPriority: result.setPriority,
    networkUsage: result.networkUsage,
    estimatedFee: result.txDetails?.estimatedFee,
    maxFee: result.txDetails?.maxFee,
    maxAmount,
    isLoading: result.isLoading || isYieldLoading,
    error: error || result.error,
    isLocked,
    setIsLocked,

    // Yield.xyz specific data
    yieldTransaction: primaryTransaction,
    isYieldTransaction: !!yieldTransaction,
  }
}
