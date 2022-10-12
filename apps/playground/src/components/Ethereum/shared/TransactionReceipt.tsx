import { useWaitForTransaction } from "wagmi"

export const TransactionReceipt = ({ hash }: { hash?: string }) => {
  const { data, error, isLoading, isError } = useWaitForTransaction({
    enabled: !!hash,
    hash: hash as `0x${string}`,
  })

  if (!hash) return null

  if (isLoading) return <div>Fetching transaction…</div>
  if (isError) return <div>Error : {error?.message}</div>
  return <pre>Transaction: {JSON.stringify(data, undefined, 2)}</pre>
}
