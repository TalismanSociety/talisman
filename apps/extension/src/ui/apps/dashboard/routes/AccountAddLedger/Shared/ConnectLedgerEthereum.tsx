import Spacer from "@talisman/components/Spacer"
import { LedgerConnectionStatus } from "@ui/domains/Account/LedgerConnectionStatus"
import { useLedgerEthereum } from "@ui/hooks/useLedgerEthereum"
import { useEffect } from "react"

export const ConnectLedgerEthereum = ({
  onReadyChanged,
  className,
}: {
  onReadyChanged?: (ready: boolean) => void
  className?: string
}) => {
  const ledger = useLedgerEthereum()

  useEffect(() => {
    onReadyChanged?.(ledger.isReady)

    return () => {
      onReadyChanged?.(false)
    }
  }, [ledger.isReady, onReadyChanged])

  return (
    <div className={className}>
      <div className="text-body-secondary m-0">
        Connect and unlock your Ledger, then open the <span className="text-body">Ethereum</span>{" "}
        app on your Ledger.
      </div>
      <Spacer small />
      <LedgerConnectionStatus {...ledger} />
    </div>
  )
}
