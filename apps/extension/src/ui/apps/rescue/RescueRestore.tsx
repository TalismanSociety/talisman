import { UploadIcon } from "@talismn/icons"
import { ChangeEventHandler, FC, useCallback, useState } from "react"
import { Button, Modal, ModalDialog, useOpenClose } from "talisman-ui"

import { RescueCtaButton } from "./RescueCtaButton"
import { TalismanJsonBackup } from "./types"

export const RescueRestore = () => {
  const { isOpen, open, close } = useOpenClose()

  return (
    <>
      <RescueCtaButton
        title="Restore"
        description="Restore Talisman from a backup file"
        onClick={open}
      />
      <Modal isOpen={isOpen} onDismiss={close}>
        <BackupModalDialog onClose={close} />
      </Modal>
    </>
  )
}

const BackupModalDialog: FC<{ onClose: () => void }> = ({ onClose }) => {
  const [state, setState] = useState<{ isInvalid?: boolean; backup?: TalismanJsonBackup }>(
    () => ({}),
  )

  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    if (!e.target.files?.[0]) {
      setState({})
      return
    }

    const reader = new FileReader()
    reader.onload = (re) => {
      try {
        const backup = JSON.parse(re.target?.result as string) as TalismanJsonBackup
        if (backup.isTalismanBackup) return setState({ backup })
      } catch (err) {
        // filed to parse
      }
      setState({ isInvalid: true })
    }
    reader.readAsText(e.target.files[0])
  }, [])

  const handleRestoreClick = useCallback(async () => {
    if (!state.backup) return
    await restoreLocalStorage(state.backup)
  }, [state.backup])

  return (
    <ModalDialog title="Backup" className="w-[50rem]" onClose={onClose}>
      <div className="flex flex-col gap-10">
        <p className="text-body-secondary leading-paragraph">
          This will restore Talisman from a backup file.
        </p>
        <div className="bg-alert-warn/10 text-alert-warn flex items-center gap-8 rounded p-5 px-8">
          <p>Existing data will be wiped, and replaced by the data from the backup file.</p>
        </div>

        <div className="border-grey-700 flex h-[7.4rem] flex-col justify-between rounded border p-5">
          <div>
            <input type="file" accept=".json,application/json" onChange={handleChange}></input>
          </div>
          {state.isInvalid && (
            <div className="text-alert-warn">Selected file is not a Talisman backup</div>
          )}
          {state.backup && <div className="text-body-secondary">Ready to restore</div>}
        </div>

        <div className="grid grid-cols-2 gap-10">
          <Button onClick={onClose}>Cancel</Button>
          <Button disabled={!state.backup} primary icon={UploadIcon} onClick={handleRestoreClick}>
            Restore
          </Button>
        </div>
      </div>
    </ModalDialog>
  )
}

const restoreLocalStorage = async (backup: TalismanJsonBackup) => {
  await chrome.storage.local.clear()
  await chrome.storage.local.set(backup.storage)
  chrome.runtime.reload()
}
