import { isTokenEth } from "@talismn/chaindata-provider"
import { isEthereumAddress } from "@talismn/crypto"
import { getEthTransferTransactionBase, isAccountOwned } from "extension-core"
import { useMemo, useState } from "react"

import { useAccountByAddress, useBalance, useNetworkById, useToken } from "@ui/state"

import { useEthTransaction } from "../Ethereum/useEthTransaction"
import { useEvmTransactionRiskAnalysis } from "../Sign/risk-analysis/ethereum/useEvmTransactionRiskAnalysis"
import { SendFundsTransactionProps } from "./types"

export const useSendFundsTransactionEth = ({
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

  const [tx, error] = useMemo(() => {
    if (
      !isTokenEth(token) ||
      !token.networkId ||
      !token ||
      !from ||
      !to ||
      !isEthereumAddress(from) ||
      !isEthereumAddress(to)
    ) {
      return [undefined, undefined]
    }

    try {
      return [
        getEthTransferTransactionBase(token.networkId, from, to, token, BigInt(value ?? "0")),
        undefined,
      ]
    } catch (err) {
      return [undefined, err as Error]
    }
  }, [from, to, token, value])

  const result = useEthTransaction(tx, token?.networkId, isLocked, false)

  // force a risk analysis scan if the account isnt owned
  const targetAccount = useAccountByAddress(to)
  const isScanRequired = useMemo(() => !!to && !isAccountOwned(targetAccount), [targetAccount, to])

  const riskAnalysis = useEvmTransactionRiskAnalysis({
    networkId: token?.networkId,
    tx,
    disableAutoRiskScan: !isScanRequired,
    disableCriticalPane: true,
  })

  const maxAmount = useMemo(() => {
    if (!balance || !isTokenEth(token)) return null

    switch (token.type) {
      case "evm-native": {
        if (!result?.txDetails?.maxFee) return null
        const val = balance.transferable.planck - result.txDetails.maxFee
        return String(val > 0n ? val : 0n)
      }
      default:
        return balance.transferable.planck ? String(balance.transferable.planck) : "0"
    }
  }, [balance, token, result?.txDetails?.maxFee])

  const [estimatedFee, maxFee] = useMemo(() => {
    if (result?.txDetails?.estimatedFee && result?.txDetails?.maxFee) {
      return [result.txDetails.estimatedFee, result.txDetails.maxFee]
    }

    return [null, null]
  }, [result.txDetails])

  if (!isTokenEth(token)) return null

  return {
    platform: "ethereum" as const,
    riskAnalysis,
    ...result,
    tx: result.transaction, // prevents naming conflicts for consumers
    error: error ?? result.error,

    maxAmount,
    estimatedFee,
    maxFee,
    feeTokenId: feeToken?.id,

    setIsLocked,
  }
}

export type SendFundsTransactionEth = ReturnType<typeof useSendFundsTransactionEth>
