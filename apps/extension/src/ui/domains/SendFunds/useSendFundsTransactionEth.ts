import { getEthTransferTransactionBase } from "@core/domains/ethereum/helpers"
import { isAccountOwned } from "@core/domains/keyring/exports"
import { isTokenEth } from "@talismn/chaindata-provider"
import { isEthereumAddress } from "@talismn/crypto"
import { useLockedValue } from "@ui/hooks/useLockedValue"
import { useAccountByAddress } from "@ui/state/accounts"
import { useBalance } from "@ui/state/balances"
import { useNetworkById, useToken } from "@ui/state/chaindata"
import { useMemo } from "react"

import { useEthTransaction } from "../Ethereum/useEthTransaction"
import { useEvmTransactionRiskAnalysis } from "../Sign/risk-analysis/ethereum/useEvmTransactionRiskAnalysis"
import type { SendFundsTransactionProps } from "./types"

export const useSendFundsTransactionEth = ({
  tokenId,
  from,
  to,
  value = "0", // default to "0" to force fee estimation
  isLocked,
}: SendFundsTransactionProps) => {
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
  const txDetails = useLockedValue(result.txDetails, isLocked)
  const gasSettingsByPriority = useLockedValue(result.gasSettingsByPriority, isLocked)

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
        if (!txDetails?.maxFee) return null
        const val = balance.transferable.planck - txDetails.maxFee
        return String(val > 0n ? val : 0n)
      }
      default:
        return balance.transferable.planck ? String(balance.transferable.planck) : "0"
    }
  }, [balance, token, txDetails?.maxFee])

  const [estimatedFee, maxFee] = useMemo(() => {
    if (txDetails?.estimatedFee && txDetails?.maxFee) {
      return [txDetails.estimatedFee, txDetails.maxFee]
    }

    return [null, null]
  }, [txDetails])

  if (!isTokenEth(token)) return null

  return {
    platform: "ethereum" as const,
    riskAnalysis,
    ...result,
    txDetails,
    gasSettingsByPriority,
    tx: result.transaction, // prevents naming conflicts for consumers
    error: error ?? result.error,

    maxAmount,
    estimatedFee,
    maxFee,
    feeTokenId: feeToken?.id,
  }
}
