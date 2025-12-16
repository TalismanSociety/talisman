import { evmNativeTokenId } from "@talismn/chaindata-provider"
import { TransactionDto } from "extension-core"
import { log } from "extension-shared"
import { useMemo } from "react"
import { TransactionRequest } from "viem"

import { useEthTransaction } from "@ui/domains/Ethereum/useEthTransaction"
import { useEvmTransactionRiskAnalysis } from "@ui/domains/Sign/risk-analysis/ethereum/useEvmTransactionRiskAnalysis"
import { useNetworkById } from "@ui/state"

import { UseYieldxyzTransactionProps } from "./types"

// const json = {
//   from: "0x5C9EBa3b10E45BF6db77267B40B95F3f91Fc5f67",
//   gasLimit: "0xdbbc",
//   to: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
//   data: "0x095ea7b300000000000000000000000044c10da836d2abe881b77bbb0b3dce5f85c0c1cc000000000000000000000000000000000000000000000000000000e8d4a51000",
//   nonce: 20,
//   type: 2,
//   maxFeePerGas: "0x01312d00",
//   maxPriorityFeePerGas: "0x00",
//   chainId: 42161,
// }

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

const deserializeYieldxyzEthTransaction = (tx: TransactionDto): TransactionRequest | null => {
  try {
    const parsedTx = JSON.parse(tx.unsignedTransaction as string) as YieldxyzEthTransaction
    return {
      from: parsedTx.from,
      to: parsedTx.to,
      value: parsedTx.value ? BigInt(parsedTx.value) : undefined,
      data: parsedTx.data,
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

  const tx = useMemo(() => {
    if (!props?.transactionDef) return null
    return deserializeYieldxyzEthTransaction(props.transactionDef)
  }, [props?.transactionDef])

  const result = useEthTransaction(tx ?? undefined, props?.networkId, props?.lockTransaction)

  const riskAnalysis = useEvmTransactionRiskAnalysis({
    networkId: props?.networkId,
    tx: tx ?? undefined,
    disableCriticalPane: true,
  })

  if (!network || !feeTokenId) return null

  return {
    platform: "ethereum" as const,
    feeTokenId,
    riskAnalysis,
    ...result,
  }
}
