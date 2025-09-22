import { isTokenEth } from "@talismn/chaindata-provider"
import { isEthereumAddress } from "@talismn/crypto"
import { useMemo, useState } from "react"

import { useEthTransaction } from "@ui/domains/Ethereum/useEthTransaction"
import { useBalance, useNetworkById, useToken } from "@ui/state"

import { useDepositWizard } from "../context/DepositWizardContext"

export const useDepositFundsTransaction = () => {
  const [isLocked, setIsLocked] = useState(false)
  const { account, tokenId, amount } = useDepositWizard()
  const token = useToken(tokenId)
  const network = useNetworkById(token?.networkId, "ethereum")
  const _feeToken = useToken(network?.nativeTokenId)
  const balance = useBalance(account as string, tokenId as string)

  // For deposits, we need to create a transaction to the protocol contract
  // This is a simplified version - in reality you'd need the actual protocol contract address
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

    try {
      // Mock protocol contract address - in reality this would come from the product
      const protocolAddress = "0x0000000000000000000000000000000000000000" as `0x${string}`

      return [
        {
          to: protocolAddress,
          value: BigInt(amount ?? "0"),
          data: "0x" as `0x${string}`, // Mock deposit function call data
        },
        undefined,
      ]
    } catch (err) {
      return [undefined, err as Error]
    }
  }, [account, token, amount])

  const result = useEthTransaction(tx, token?.networkId, isLocked, false)

  const maxAmount = useMemo(() => {
    if (!balance || !isTokenEth(token) || !result.txDetails?.estimatedFee) return null

    // For deposits, max amount is balance minus estimated fee
    const val = balance.transferable.planck - BigInt(result.txDetails.estimatedFee)
    return String(val > 0n ? val : 0n)
  }, [balance, token, result.txDetails?.estimatedFee])

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
    isLoading: result.isLoading,
    error: error || result.error,
    isLocked,
    setIsLocked,
  }
}
