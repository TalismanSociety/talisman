import type { TransactionDto } from "@core/domains/earn/exports"

import { type FC, useMemo } from "react"

import { TransactionsStepper } from "../../shared/TransactionsStepper"

export const YieldxyzTransactionsStepper: FC<{
  transactions: TransactionDto[]
  stepIndex: number
  isProcessing?: boolean
}> = ({ transactions, stepIndex, isProcessing }) => {
  const steps = useMemo(
    () =>
      transactions.map((transaction, index) => ({
        key: transaction.id ?? String(index),
        label: transaction.type.replaceAll("_", " ").toLowerCase(),
        isProcessing: transaction.status === "BROADCASTED",
      })),
    [transactions]
  )

  if (!transactions?.length) return null

  return <TransactionsStepper steps={steps} stepIndex={stepIndex} isProcessing={isProcessing} />
}
