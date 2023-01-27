import { SendFundsProgress } from "@ui/domains/SendFunds/SendFundsProgress"
import { useCallback, useMemo } from "react"
import { useSearchParams } from "react-router-dom"

export const SendFundsSubmitted = () => {
  const [searchParams] = useSearchParams()

  const txInfo = useMemo(() => {
    const evmTxHash = searchParams.get("evmTxHash") ?? undefined
    const substrateTxId = searchParams.get("substrateTxId") ?? undefined
    const evmNetworkId = searchParams.get("evmNetworkId") ?? undefined

    return { evmTxHash, substrateTxId, evmNetworkId }
  }, [searchParams])

  const handleClose = useCallback(() => {
    window.close()
  }, [])

  return (
    <div className="h-full w-full px-12 py-8">
      <SendFundsProgress {...txInfo} onClose={handleClose} />
    </div>
  )
}
