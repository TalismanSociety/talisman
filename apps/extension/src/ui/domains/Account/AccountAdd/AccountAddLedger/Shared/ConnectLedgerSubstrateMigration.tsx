import { Spacer } from "@talisman/components/Spacer"
import { LedgerConnectionStatus } from "@ui/domains/Account/LedgerConnectionStatus"
import { useLedgerSubstrateMigration } from "@ui/hooks/ledger/useLedgerSubstrateMigration"
import { useLedgerSubstrateMigrationApp } from "@ui/hooks/ledger/useLedgerSubstrateMigrationApps"
import { FC, useEffect } from "react"
import { Trans, useTranslation } from "react-i18next"

type ConnectLedgerSubstrateMigrationProps = {
  migrationAppName: string | undefined
  onReadyChanged?: (ready: boolean) => void
  className?: string
}

const APP_NAME = "Polkadot Migration"

export const ConnectLedgerSubstrateMigration: FC<ConnectLedgerSubstrateMigrationProps> = ({
  migrationAppName,
  onReadyChanged,
  className,
}) => {
  const app = useLedgerSubstrateMigrationApp(migrationAppName)
  const ledger = useLedgerSubstrateMigration(app?.name, true)
  const { t } = useTranslation("admin")

  useEffect(() => {
    onReadyChanged?.(ledger.isReady)

    return () => {
      onReadyChanged?.(false)
    }
  }, [ledger.isReady, onReadyChanged])

  // console.log("ConnectLedgerSubstrateMigration", { app, migrationAppName })

  if (!app) return null

  return (
    <div className={className}>
      <div className="text-body-secondary m-0">
        <Trans
          t={t}
          components={{
            AppName: <span className="text-body">{APP_NAME}</span>,
          }}
          defaults="Connect and unlock your Ledger, then open the <AppName /> app on your Ledger."
        />
      </div>
      <Spacer small />
      <LedgerConnectionStatus {...ledger} />
    </div>
  )
}
