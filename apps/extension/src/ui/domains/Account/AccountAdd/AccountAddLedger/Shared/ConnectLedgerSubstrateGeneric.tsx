import { Spacer } from "@talisman/components/Spacer"
import { LedgerConnectionStatus } from "@ui/domains/Account/LedgerConnectionStatus"
import { useLedgerSubstrateGeneric } from "@ui/hooks/ledger/useLedgerSubstrateGeneric"
import { FC, useEffect } from "react"
import { useTranslation } from "react-i18next"

type ConnectLedgerSubstrateGenericProps = {
  onReadyChanged?: (ready: boolean) => void
  className?: string
}

export const ConnectLedgerSubstrateGeneric: FC<ConnectLedgerSubstrateGenericProps> = ({
  onReadyChanged,
  className,
}) => {
  const ledger = useLedgerSubstrateGeneric(true)
  const { t } = useTranslation("admin")

  useEffect(() => {
    onReadyChanged?.(ledger.isReady)

    return () => {
      onReadyChanged?.(false)
    }
  }, [ledger.isReady, onReadyChanged])

  return (
    <div className={className}>
      <div className="text-body-secondary m-0">
        {t("Connect and unlock your Ledger, then open the Polkadot app on your Ledger.")}
      </div>
      <Spacer small />
      <LedgerConnectionStatus {...ledger} />
    </div>
  )
}
