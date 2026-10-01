import { TxProgress } from "@ui/domains/Transactions/TxProgress"
import { useCallback, useMemo } from "react"
import { useSearchParams } from "react-router-dom"

import { useSendFundsWizard } from "./context"

export const SendFundsSubmitted = () => {
  const [searchParams] = useSearchParams()
  const { gotoProgress } = useSendFundsWizard()

  const [txId, networkId] = useMemo(
    () => [
      (searchParams.get("txId") as string) ?? undefined,
      (searchParams.get("networkId") as string) ?? undefined,
    ],
    [searchParams]
  )

  const handleClose = useCallback(() => {
    window.close()
  }, [])

  return (
    <div id="main" className="relative h-full w-full px-12 py-8">
      <TxProgress
        hash={txId}
        networkIdOrHash={networkId}
        wording="transfer"
        className="pt-24"
        onClose={handleClose}
        onReplacementComplete={gotoProgress}
      />
    </div>
  )
}
