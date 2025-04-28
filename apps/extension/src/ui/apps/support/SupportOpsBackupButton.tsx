import { SaveIcon } from "@talismn/icons"
import { FC } from "react"
import { Button, Modal, ModalDialog, useOpenClose } from "talisman-ui"

import downloadJson from "@talisman/util/downloadJson"

import { SupportOpsCtaButton } from "./shared/SupportOpsCtaButton"
import { TalismanJsonBackup } from "./shared/types"

export const SupportOpsBackup = () => {
  const { isOpen, open, close } = useOpenClose()

  return (
    <>
      <SupportOpsCtaButton
        title="Backup"
        description="Export your Talisman data as a file"
        onClick={open}
      />

      <Modal isOpen={isOpen} onDismiss={close}>
        <BackupModalDialog onClose={close} />
      </Modal>
    </>
  )
}

const BackupModalDialog: FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <ModalDialog title="Backup" className="w-[40rem]" onClose={onClose}>
      <div className="flex flex-col gap-10">
        <p className="text-body-secondary leading-paragraph">
          This will export all your Talisman data as a file, so you can restore it in another
          browser. Make sure to store it safely.
        </p>
        <div className="bg-alert-warn/10 text-alert-warn flex items-center gap-8 rounded p-5 px-8">
          <p>
            DO NOT share this file with anyone.
            <br />
            Talisman support team will never ask for it.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-10">
          <Button onClick={onClose}>Cancel</Button>
          <Button primary icon={SaveIcon} onClick={backupLocalStorage}>
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
