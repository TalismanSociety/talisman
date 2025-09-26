import { isTokenSol } from "@talismn/chaindata-provider"
import { useState } from "react"

import { useBalance, useNetworkById, useToken } from "@ui/state"

import { useDepositWizard } from "../context/DepositWizardContext"

export const useDepositFundsTransactionSol = () => {
  const [isLocked, setIsLocked] = useState(false)
  const { account, tokenId } = useDepositWizard()
  const token = useToken(tokenId)
  const _network = useNetworkById(token?.networkId, "solana")
  const _balance = useBalance(account as string, tokenId as string)

  // For now, Earn only supports Ethereum networks
  // This is a placeholder for future Solana support
  if (!isTokenSol(token)) return null

  return {
    platform: "solana" as const,
    tx: null,
    txDetails: null,
    priority: null,
    gasSettingsByPriority: null,
    setCustomSettings: () => {},
    setPriority: () => {},
    networkUsage: null,
    estimatedFee: null,
    maxFee: null,
    maxAmount: null,
    isLoading: false,
    error: new Error("Earn deposits are not yet supported on Solana networks"),
    isLocked,
    setIsLocked,

    // Yield.xyz specific data
    yieldTransaction: null,
    isYieldTransaction: false,
  }
}
