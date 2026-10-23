import type { TransactionDto } from "@core/domains/earn/exports"
import { getSequentialStepStatus, TransactionsStepper } from "@ui/components/TransactionsStepper"
import { type FC, useMemo } from "react"

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
        status:
          transaction.status === "BROADCASTED"
            ? ("in-progress" as const)
            : getSequentialStepStatus(index, stepIndex, transactions.length, !!isProcessing),
      })),
    [transactions, stepIndex, isProcessing]
  )

  if (!transactions?.length) return null

  return <TransactionsStepper steps={steps} />
}
