import { SaveIcon } from "@talismn/icons"
import { Button } from "@ui/components/Button"
import { Modal } from "@ui/components/Modal"
import { ModalDialog } from "@ui/components/ModalDialog"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import downloadJson from "@ui/util/downloadJson"
import { type FC, useCallback } from "react"
import { SupportOpsCtaButton } from "./shared/SupportOpsCtaButton"
import type { TalismanJsonBackup } from "./shared/types"

export const SupportOpsBackup = () => {
  const { isOpen, open, close } = useOpenClose()

  return (
    <>
      <SupportOpsCtaButton
        title="Backup"
        description="Export your Talisman data to a file"
        onClick={open}
      />

      <Modal isOpen={isOpen} onDismiss={close}>
        <BackupModalDialog onClose={close} />
      </Modal>
    </>
  )
}

const BackupModalDialog: FC<{ onClose: () => void }> = ({ onClose }) => {
  const handleSave = useCallback(async () => {
    await backupLocalStorage()
    onClose()
  }, [onClose])

  return (
    <ModalDialog title="Backup" className="w-[25rem]" onClose={onClose}>
      <div className="flex flex-col gap-10">
        <p className="text-body-secondary leading-paragraph">
          This will save all your Talisman data into a file, which you can use to restore your
          Talisman on another browser.
          <br />
          Make sure to store this file securely.
        </p>
        <div className="flex items-center justify-center gap-8 rounded bg-alert-warn/10 p-5 px-8 text-center text-alert-warn text-sm">
          <p>
            <strong>DO NOT</strong> share your backup file with <strong>anyone</strong>.
            <br />
            The Talisman support team will <strong>never</strong> ask for it.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-10">
          <Button onClick={onClose}>Cancel</Button>
          <Button primary icon={SaveIcon} onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </ModalDialog>
  )
}

const backupLocalStorage = async () => {
  const backup: TalismanJsonBackup = {
    isTalismanBackup: true,
    version: process.env.VERSION!,
    timestamp: Date.now(),
    storage: await chrome.storage.local.get(),
  }

  downloadJson(backup, `backup.talisman.${backup.timestamp}`)
}
