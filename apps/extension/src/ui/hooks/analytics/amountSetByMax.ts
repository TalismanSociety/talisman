import { useCallback, useState } from "react"

type SetByMax = { amount: bigint; applied: boolean }

export const useAmountSetByMax = (amount: bigint | null | undefined) => {
  const [setByMax, setSetByMax] = useState<SetByMax | null>(null)

  if (setByMax && amount === setByMax.amount && !setByMax.applied)
    setSetByMax({ ...setByMax, applied: true })
  if (setByMax?.applied && amount !== setByMax.amount) setSetByMax(null)

  const setAmountSetByMax = useCallback(
    (amount: bigint) => setSetByMax({ amount, applied: false }),
    []
  )

  return [setByMax?.amount ?? null, setAmountSetByMax] as const
}
