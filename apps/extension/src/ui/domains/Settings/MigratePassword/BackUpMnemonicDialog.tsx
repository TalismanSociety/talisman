import { ArrowRightIcon } from "@talismn/icons"
import { Mnemonic } from "@ui/domains/Mnemonic/Mnemonic"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { ModalDialog } from "talisman-ui"
import { Button } from "talisman-ui"

import { useMigratePassword } from "./context"

const ShowMnemonic = () => {
  const { t } = useTranslation()
  const [hasHovered, setHasHovered] = useState(false)
  const { setMnemonicBackupConfirmed, mnemonic } = useMigratePassword()

  if (!mnemonic) return null

  return (
    <ModalDialog title="Secret recovery phrase">
      <p className="text-body-secondary text-sm">
        {t("Your secret phrase protects your account. If you share it you may lose your funds.")}
      </p>

      <p className="text-body-secondary text-sm">
        {t(
          "We strongly encourage you to back up your recovery phrase by writing it down and storing it in a secure location."
        )}
      </p>

      <Mnemonic mnemonic={mnemonic} onReveal={() => setHasHovered(true)} />

      <div className="mt-20 flex justify-end">
        <Button
          primary={hasHovered}
          onClick={setMnemonicBackupConfirmed}
          disabled={!hasHovered}
          icon={ArrowRightIcon}
        >
          {t("I've backed it up")}
        </Button>
      </div>
    </ModalDialog>
  )
}

export const BackUpMnemonicDialog = () => {
  const { t } = useTranslation()

  const [showMnemonic, setShowMnemonic] = useState<boolean>(false)
  const { setMnemonicBackupConfirmed } = useMigratePassword()
  if (showMnemonic) return <ShowMnemonic />
  return (
    <ModalDialog title="Don't lose access to your wallet">
      <p className="text-body-secondary text-sm">{t("Have you backed up your recovery phrase?")}</p>
      <p className="text-body-secondary text-sm">
        {t(
          "Your recovery phrase is used to restore your Talisman accounts if you forget your password or lose access to your device."
        )}
      </p>
      <p className="text-body-secondary text-sm">
        {t(
          "We strongly encourage you to back up your recovery phrase by writing it down and storing it in a secure location."
        )}
      </p>
      <div className="mt-20 flex justify-between">
        <Button className="mr-4 px-4" onClick={setMnemonicBackupConfirmed} fullWidth>
          {t("I've already backed up")}
        </Button>
        <Button onClick={() => setShowMnemonic(true)} primary fullWidth>
          {t("Backup now")}
        </Button>
      </div>
    </ModalDialog>
  )
}
