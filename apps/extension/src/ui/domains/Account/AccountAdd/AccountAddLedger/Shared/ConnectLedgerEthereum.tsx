import { Spacer } from "@talisman/components/Spacer"
import { LedgerConnectionStatus } from "@ui/domains/Account/LedgerConnectionStatus"
import { useLedgerEthereum } from "@ui/hooks/ledger/useLedgerEthereum"
import { useEffect } from "react"
import { Trans, useTranslation } from "react-i18next"

export const ConnectLedgerEthereum = ({
  onReadyChanged,
  className,
}: {
  onReadyChanged?: (ready: boolean) => void
  className?: string
}) => {
  const { t } = useTranslation("admin")
  const ledger = useLedgerEthereum(true)

  useEffect(() => {
    onReadyChanged?.(ledger.isReady)

    return () => {
      onReadyChanged?.(false)
    }
  }, [ledger.isReady, onReadyChanged])

  return (
    <div className={className}>
      <div className="text-body-secondary m-0">
        <Trans t={t}>
          Connect and unlock your Ledger, then open the <span className="text-body">Ethereum</span>{" "}
          app on your Ledger.
        </Trans>
      </div>
      <Spacer small />
      <LedgerConnectionStatus {...ledger} />
    </div>
  )
}
