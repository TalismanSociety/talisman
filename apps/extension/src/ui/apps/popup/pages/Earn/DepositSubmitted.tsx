import { useCallback, useMemo } from "react"
import { useSearchParams } from "react-router-dom"

import { SendFundsProgress } from "@ui/domains/SendFunds/SendFundsProgress"

export const DepositSubmitted = () => {
  const [searchParams] = useSearchParams()

  const [txId, networkId] = useMemo(
    () => [searchParams.get("txId") ?? undefined, searchParams.get("networkId") ?? undefined],
    [searchParams],
  )

  const handleClose = useCallback(() => {
    window.close()
  }, [])

  return (
    <div id="main" className="relative h-full w-full px-12 py-8">
      <SendFundsProgress txId={txId ?? ""} networkId={networkId ?? ""} onClose={handleClose} />
    </div>
  )
}
