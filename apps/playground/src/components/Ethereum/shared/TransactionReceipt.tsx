import { formatUnits } from "ethers/lib/utils.js"
import { useMemo } from "react"
import { useWaitForTransactionReceipt } from "wagmi"

export const TransactionReceipt = ({ hash }: { hash?: string }) => {
  const { data, error, isLoading, isError } = useWaitForTransactionReceipt({
    hash: hash as `0x${string}`,
    query: { enabled: !!hash },
  })

  const resolvedData = useMemo(
    () =>
      data
        ? {
            ...data,
            // make big numbers readable
            gasUsed: data.gasUsed ? Number(data.gasUsed.toString()) : undefined,
            cumulativeGasUsed: data.cumulativeGasUsed
              ? Number(data.cumulativeGasUsed.toString())
              : undefined,
            effectiveGasPrice: data.effectiveGasPrice
              ? `${formatUnits(data.effectiveGasPrice, "gwei")} GWEI`
              : undefined,
          }
        : null,
    [data]
  )

  if (!hash) return null

  if (isLoading) return <div>Fetching transaction…</div>
  if (isError) return <div>Error : {error?.message}</div>
  return <pre>Transaction: {JSON.stringify(resolvedData, undefined, 2)}</pre>
}
