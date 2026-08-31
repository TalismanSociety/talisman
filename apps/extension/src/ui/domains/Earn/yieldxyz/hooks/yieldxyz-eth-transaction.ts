import { log } from "@common/log"
import type { TransactionDto } from "@core/domains/earn/exports"
import type { TransactionRequest } from "viem"

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

// a Solana payload is base64 and parses to nothing here, which callers treat as "no EVM transaction"
const parseYieldxyzEthTransaction = (tx: TransactionDto): YieldxyzEthTransaction | null => {
  try {
    const parsed = JSON.parse(tx.unsignedTransaction as string)
    return parsed && typeof parsed === "object" ? (parsed as YieldxyzEthTransaction) : null
  } catch {
    return null
  }
}

export const deserializeYieldxyzEthTransaction = (
  tx: TransactionDto,
  nonce: number | undefined
): TransactionRequest | null => {
  const parsedTx = parseYieldxyzEthTransaction(tx)
  if (!parsedTx) {
    log.error("Failed to deserialize Yieldxyz ETH transaction", { tx })
    return null
  }

  try {
    return {
      from: parsedTx.from,
      to: parsedTx.to,
      value: parsedTx.value ? BigInt(parsedTx.value) : undefined,
      data: parsedTx.data,
      nonce,
    }
  } catch (err) {
    log.error("Failed to deserialize Yieldxyz ETH transaction", { tx, err })
    return null
  }
}

/** `null` means the transaction is EVM but its value cannot be read - never a spend of nothing */
export const getYieldxyzEthTransactionValue = (tx: TransactionDto): bigint | null => {
  const value = parseYieldxyzEthTransaction(tx)?.value
  if (!value) return 0n

  try {
    return BigInt(value)
  } catch {
    return null
  }
}
