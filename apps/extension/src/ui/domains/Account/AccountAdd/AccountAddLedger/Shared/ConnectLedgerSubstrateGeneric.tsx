import { FC, useEffect } from "react"
import { useTranslation } from "react-i18next"

import { Spacer } from "@talisman/components/Spacer"
import { LedgerConnectionStatus } from "@ui/domains/Account/LedgerConnectionStatus"
import { useLedgerSubstrateAppByName } from "@ui/hooks/ledger/useLedgerSubstrateApp"
import { useLedgerSubstrateGeneric } from "@ui/hooks/ledger/useLedgerSubstrateGeneric"

type ConnectLedgerSubstrateGenericProps = {
  onReadyChanged?: (ready: boolean) => void
  className?: string
  appName?: string | null
}

export const ConnectLedgerSubstrateGeneric: FC<ConnectLedgerSubstrateGenericProps> = ({
  onReadyChanged,
  className,
  appName,
}) => {
  const app = useLedgerSubstrateAppByName(appName)
  const ledger = useLedgerSubstrateGeneric({ persist: true, app })
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
        {t("Connect and unlock your Ledger, then open the {{appName}} app on your Ledger.", {
          appName: app ? "Polkadot Migration" : "Polkadot",
        })}
      </div>
      <Spacer small />
      <LedgerConnectionStatus {...ledger} />
    </div>
  )
}
