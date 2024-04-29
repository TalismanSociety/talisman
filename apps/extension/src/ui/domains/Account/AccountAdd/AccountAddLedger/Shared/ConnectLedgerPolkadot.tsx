import { Spacer } from "@talisman/components/Spacer"
import { LedgerConnectionStatus } from "@ui/domains/Account/LedgerConnectionStatus"
import { useLedgerPolkadot } from "@ui/hooks/ledger/useLedgerPolkadot"
import { FC, useEffect } from "react"
import { Trans, useTranslation } from "react-i18next"

type ConnectLedgerPolkadotProps = {
  onReadyChanged?: (ready: boolean) => void
  className?: string
}

export const ConnectLedgerPolkadot: FC<ConnectLedgerPolkadotProps> = ({
  onReadyChanged,
  className,
}) => {
  const { t } = useTranslation("admin")
  const ledger = useLedgerPolkadot(true)

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
          Connect and unlock your Ledger, then open the <span className="text-body">Polkadot</span>{" "}
          app on your Ledger.
        </Trans>
      </div>
      <Spacer small />
      <LedgerConnectionStatus {...ledger} />
    </div>
  )
}
