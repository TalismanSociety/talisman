import { useAppState } from "@ui/hooks/useAppState"
import { useCallback, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Button, Drawer, useOpenClose } from "talisman-ui"

export const LedgerPolkadotUpgradeAlertDrawer = () => {
  const { t } = useTranslation()
  const [showAlert, setShowAlert] = useAppState("showLedgerPolkadotGenericMigrationAlert")
  const { open, close, isOpen } = useOpenClose()

  useEffect(() => {
    if (showAlert) open()
  }, [open, showAlert])

  const handleLearnMoreClick = useCallback(() => {
    window.open(
      "https://wiki.polkadot.network/docs/ledger#polkadot-ledger-generic-app",
      "_blank",
      "noopener noreferrer"
    )
  }, [])

  const handleCloseClick = useCallback(() => {
    setShowAlert(false)
    close()
  }, [close, setShowAlert])

  return (
    <Drawer containerId="main" isOpen={isOpen} anchor="bottom" onDismiss={close}>
      <div className="bg-black-tertiary flex max-w-[42rem] flex-col items-center gap-12 rounded-t-xl p-12">
        <div className="flex flex-col gap-4 text-center">
          <p className="font-bold text-white">{t("The Ledger Polkadot Generic app is here!")}</p>
          <p className="text-body-secondary mt-4 text-sm">
            {t(
              "Your Ledger Polkadot account(s) were upgraded to be compatible with the new Polkadot Generic Ledger app."
            )}
          </p>
          <p className="text-body-secondary text-sm">
            {t(
              "Make sure to update your Ledger device with the latest Polkadot app to access your accounts."
            )}
          </p>
          <p className="text-body-secondary text-sm">
            {t(
              "For Ledger accounts for other Polkadot network chains, please use the Ledger Migration app to upgrade."
            )}
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-8">
          <Button onClick={handleLearnMoreClick}>{t("Learn More")}</Button>
          <Button primary onClick={handleCloseClick}>
            {t("Got It")}
          </Button>
        </div>
      </div>
    </Drawer>
  )
}
