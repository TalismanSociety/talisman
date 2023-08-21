import { notify } from "@talisman/components/Notifications"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { provideContext } from "@talisman/util/provideContext"
import { useCallback, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Button, ModalDialog } from "talisman-ui"
import { Modal } from "talisman-ui"

import { useMnemonic, useMnemonics } from "./useMnemonics"

const useMnemonicDeleteModalProvider = () => {
  const mnemonics = useMnemonics()
  const [mnemonicId, setMnemonicId] = useState<string>()
  const mnemonic = useMnemonic(mnemonicId)

  const { isOpen, open: innerOpen, close } = useOpenClose()

  const open = useCallback(
    (mnemonicId?: string) => {
      setMnemonicId(mnemonicId)
      innerOpen()
    },
    [innerOpen]
  )

  const canDelete = useCallback(
    (mnemonicId: string) => {
      const mnemonic = mnemonics.find((m) => m.id === mnemonicId)
      return !!mnemonic?.confirmed
    },
    [mnemonics]
  )

  return {
    mnemonic,
    isOpen,
    open,
    close,
    canDelete,
  }
}

export const [MnemonicDeleteModalProvider, useMnemonicDeleteModal] = provideContext(
  useMnemonicDeleteModalProvider
)

export const MnemonicDeleteModal = () => {
  const { t } = useTranslation("admin")
  const { mnemonic, close, isOpen } = useMnemonicDeleteModal()

  const handleConfirmClick = useCallback(async () => {
    try {
      if (!mnemonic) return
    } catch (err) {
      notify({
        type: "error",
        title: t("Failed to delete"),
        subtitle: (err as Error)?.message ?? "",
      })
    }
  }, [mnemonic, t])

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <ModalDialog title={t("Set as Polkadot Vault Verifier")} onClose={close}>
        <div>
          <Trans
            t={t}
            components={{ Highlight: <span className="text-body"></span> }}
            defaults="Are you sure that you want to delete <Highlight>{{name}}</Highlight>?"
          />
        </div>
        <div className="mt-12 grid grid-cols-2 gap-8">
          <Button onClick={close}>{t("Cancel")}</Button>
          <Button primary onClick={handleConfirmClick}>
            {t("Delete")}
          </Button>
        </div>
      </ModalDialog>
    </Modal>
  )
}
