import { evmNativeTokenId } from "@talismn/chaindata-provider"
import { isEthereumAddress } from "@talismn/crypto"
import { useQuery } from "@tanstack/react-query"
import { TransactionDto } from "extension-core"
import { log } from "extension-shared"
import { useMemo } from "react"
import { TransactionRequest } from "viem"

import { useEthTransaction } from "@ui/domains/Ethereum/useEthTransaction"
import { usePublicClient } from "@ui/domains/Ethereum/usePublicClient"
import { useEvmTransactionRiskAnalysis } from "@ui/domains/Sign/risk-analysis/ethereum/useEvmTransactionRiskAnalysis"
import { useNetworkById } from "@ui/state"

import { UseYieldxyzTransactionProps } from "./types"

type YieldxyzEthTransaction = {
  type: number
  chainId: number
  from: `0x${string}`
  to: `0x${string}`
  nonce: number
  value?: `0x${string}`
  data?: `0x${string}`
  gasLimit?: `0x${string}`
  maxFeePerGas?: `0x${string}`
  maxPriorityFeePerGas?: `0x${string}`
}

const deserializeYieldxyzEthTransaction = (
  tx: TransactionDto,
  nonce: number | undefined,
): TransactionRequest | null => {
  try {
    const parsedTx = JSON.parse(tx.unsignedTransaction as string) as YieldxyzEthTransaction
    return {
      from: parsedTx.from,
      to: parsedTx.to,
      value: parsedTx.value ? BigInt(parsedTx.value) : undefined,
      data: parsedTx.data,
      nonce,
    }
  } catch (error) {
    log.error("Failed to deserialize Yieldxyz ETH transaction", error)
    return null
  }
}

export const useYieldxyzTransactionEth = (props: UseYieldxyzTransactionProps | null) => {
  const network = useNetworkById(props?.networkId, "ethereum")

  const feeTokenId = useMemo(
    () => (props?.networkId ? evmNativeTokenId(props?.networkId) : null),
    [props?.networkId],
  )

  const publicClient = usePublicClient(props?.networkId)

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
    if (!props?.transactionDef) return null
    return deserializeYieldxyzEthTransaction(props.transactionDef, nonce ?? undefined)
  }, [props?.transactionDef, nonce])

  const result = useEthTransaction(tx ?? undefined, props?.networkId, props?.lockTransaction, true) // mark as replacement so we can force the nonce

  const riskAnalysis = useEvmTransactionRiskAnalysis({
    networkId: props?.networkId,
    tx: tx ?? undefined,
    disableCriticalPane: true,
  })

  if (!network || !feeTokenId) return null

  return {
    platform: "ethereum" as const,
    networkId: network.id,
    feeTokenId,
    riskAnalysis,
    ...result,
  }
}
