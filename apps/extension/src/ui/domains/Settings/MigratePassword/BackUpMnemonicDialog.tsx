import { ModalDialog } from "@talisman/components/ModalDialog"
import { Button } from "talisman-ui"
import { ArrowRightIcon } from "@talisman/theme/icons"
import { Mnemonic } from "@ui/domains/Account/Mnemonic"
import { useMigratePassword } from "./context"
import { useState } from "react"

const ShowMnemonic = () => {
  const [hasHovered, setHasHovered] = useState(false)
  const { setMnemonicBackupConfirmed, mnemonic } = useMigratePassword()

  if (!mnemonic) return null

  return (
    <ModalDialog title="Secret recovery phrase">
      <p className="text-body-secondary text-sm">
        Your secret phrase protects your account. If you share it you may lose your funds.
      </p>

      <p className="text-body-secondary text-sm">
        We strongly encourage you to back up your recovery phrase by writing it down and storing it
        in a secure location.
      </p>

      <Mnemonic mnemonic={mnemonic} onMouseEnter={() => setHasHovered(true)} />

      <div className="mt-20 flex justify-end">
        <Button
          primary={hasHovered}
          onClick={setMnemonicBackupConfirmed}
          disabled={!hasHovered}
          icon={ArrowRightIcon}
        >
          I've backed it up
        </Button>
      </div>
    </ModalDialog>
  )
}

export const BackUpMnemonicDialog = () => {
  const [showMnemonic, setShowMnemonic] = useState<boolean>(false)
  const { setMnemonicBackupConfirmed } = useMigratePassword()
  if (showMnemonic) return <ShowMnemonic />
  return (
    <ModalDialog title="Don't lose access to your wallet">
      <p className="text-body-secondary text-sm">Have you backed up your recovery phrase?</p>
      <p className="text-body-secondary text-sm">
        Your recovery phrase is used to restore your Talisman accounts if you or forget your
        password, or lose access to your device.
      </p>
      <p className="text-body-secondary text-sm">
        We strongly encourage you to back up your recovery phrase by writing it down and storing it
        in a secure location
      </p>
      <div className="mt-20 flex justify-between">
        <Button className="mr-4 px-4" onClick={setMnemonicBackupConfirmed} fullWidth>
          I've already backed up
        </Button>
        <Button onClick={() => setShowMnemonic(true)} primary fullWidth>
          Backup now
        </Button>
      </div>
    </ModalDialog>
  )
}
