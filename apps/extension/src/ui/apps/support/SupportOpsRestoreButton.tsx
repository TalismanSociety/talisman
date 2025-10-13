import { UploadIcon } from "@talismn/icons"
import { ChangeEventHandler, FC, useCallback, useState } from "react"
import { Button, Modal, ModalDialog, useOpenClose } from "talisman-ui"

import { SupportOpsCtaButton } from "./shared/SupportOpsCtaButton"
import { TalismanJsonBackup } from "./shared/types"

export const SupportOpsRestoreButton = () => {
  const { isOpen, open, close } = useOpenClose()

  return (
    <>
      <SupportOpsCtaButton
        title="Restore"
        description="Import your Talisman data from a backup file"
        onClick={open}
      />
      <Modal isOpen={isOpen} onDismiss={close}>
        <RestoreModalDialog onClose={close} />
      </Modal>
    </>
  )
}

const RestoreModalDialog: FC<{ onClose: () => void }> = ({ onClose }) => {
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
    <ModalDialog title="Restore" className="w-[50rem]" onClose={onClose}>
      <div className="flex flex-col gap-10">
        <p className="text-body-secondary leading-paragraph">
          This will replace all existing Talisman data with the data from your backup file.
        </p>
        <div className="bg-alert-warn/10 text-alert-warn flex items-center justify-center gap-8 rounded p-5 px-8 text-center text-sm">
          <p>Warning: All existing data will be erased and replaced.</p>
        </div>

        <div className="border-grey-700 flex h-[7.4rem] flex-col justify-between rounded border p-5">
          <div>
            <input type="file" accept=".json,application/json" onChange={handleChange}></input>
          </div>
          {state.isInvalid && (
            <div className="text-alert-warn">Selected file is not a Talisman backup file.</div>
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
