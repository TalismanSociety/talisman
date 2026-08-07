import { isEthereumAddress } from "@talismn/crypto"
import { useQuery } from "@tanstack/react-query"
import { useEthTransaction } from "@ui/domains/Ethereum/useEthTransaction"
import { usePublicClient } from "@ui/domains/Ethereum/usePublicClient"
import { useEvmTransactionRiskAnalysis } from "@ui/domains/Sign/risk-analysis/ethereum/useEvmTransactionRiskAnalysis"
import { useNetworkById } from "@ui/state/chaindata"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { getYieldxyzEvmTransactionIssue } from "./provider-transaction-guards"
import type { UseYieldxyzTransactionProps } from "./types"
import { deserializeYieldxyzEthTransaction } from "./yieldxyz-eth-transaction"

export const useYieldxyzTransactionEth = (props: UseYieldxyzTransactionProps | null) => {
  const { t } = useTranslation()
  const publicClient = usePublicClient(props?.networkId)
  const network = useNetworkById(props?.networkId, "ethereum")

  // we need to refresh nonce every time the transaction changes, because useEthTransaction wont do it
  const { data: nonce } = useQuery({
    queryKey: ["nonce", props, publicClient?.uid],
    queryFn: () => {
      if (!publicClient || !props?.address || !isEthereumAddress(props.address)) return null

      return publicClient.getTransactionCount({
        address: props.address,
        blockTag: "pending",
      })
    },
  })

  const tx = useMemo(() => {
    if (!network || !props?.transaction) return null
    return deserializeYieldxyzEthTransaction(props.transaction, nonce ?? undefined)
  }, [network, props?.transaction, nonce])

  const providerError = useMemo(() => {
    if (!tx || !props) return null

    switch (
      getYieldxyzEvmTransactionIssue({
        from: tx.from,
        value: tx.value,
        address: props.address,
        maxNativeValue: props.maxNativeValue,
      })
    ) {
      case "sender":
        return t("Unexpected sender address. Please try again.")
      case "amount":
        return t("Unexpected transaction amount. Please try again.")
      default:
        return null
    }
  }, [props, t, tx])

  const validTx = providerError ? undefined : (tx ?? undefined)

  const result = useEthTransaction(validTx, props?.networkId, props?.lockTransaction, true) // mark as replacement so we can force the nonce

  const riskAnalysis = useEvmTransactionRiskAnalysis({
    networkId: props?.networkId,
    tx: validTx,
    disableCriticalPane: true,
  })

  if (!network) return null

  return {
    platform: "ethereum" as const,
    networkId: network.id,
    feeTokenId: network.nativeTokenId,
    riskAnalysis,
    ...result,
    error: providerError ?? result.error,
  }
}
