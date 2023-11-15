import { notify } from "@talisman/components/Notifications"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { provideContext } from "@talisman/util/provideContext"
import { AlertTriangleIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { useMnemonic, useMnemonics } from "@ui/hooks/useMnemonics"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Button, FormFieldInputText, ModalDialog } from "talisman-ui"
import { Modal } from "talisman-ui"

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
  const [inputCheck, setInputCheck] = useState<string>("")

  // keep name in memory so it can still be displayed while modal is closing
  const [name, setName] = useState<string>()
  useEffect(() => {
    if (mnemonic) setName(mnemonic.name)
  }, [mnemonic])

  const handleConfirmClick = useCallback(async () => {
    try {
      if (!mnemonic) return
      await api.mnemonicDelete(mnemonic.id)
      close()
    } catch (err) {
      notify({
        type: "error",
        title: t("Failed to delete"),
        subtitle: (err as Error)?.message ?? "",
      })
    }
  }, [close, mnemonic, t])

  const disableDelete = useMemo(() => {
    return t("Delete").trim().toLowerCase() !== inputCheck.trim().toLowerCase()
  }, [inputCheck, t])

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <ModalDialog
        title={
          <div className="flex items-center gap-4">
            <AlertTriangleIcon className="text-brand-orange inline text-lg" />
            <span>{t("Delete Recovery Phrase")}</span>
          </div>
        }
        onClose={close}
      >
        <p className="text-body-secondary">
          <Trans
            t={t}
            components={{ Highlight: <span className="text-body"></span> }}
            defaults="Are you sure that you want to delete <Highlight>{{name}}</Highlight>?"
            values={{ name }}
          />
        </p>
        <div>
          <div className="text-body-disabled mb-4 mt-12">{t("Type Delete to continue")}</div>
          <FormFieldInputText
            placeholder={t("Delete")}
            defaultValue=""
            onChange={(e) => setInputCheck(e.target.value)}
          />
        </div>
        <div className="mt-12 grid grid-cols-2 gap-8">
          <Button onClick={close}>{t("Cancel")}</Button>
          <Button
            primary
            onClick={handleConfirmClick}
            disabled={disableDelete}
            className="enabled:!bg-brand-orange hover:enabled:!bg-brand-orange/80  enabled:text-white"
          >
            {t("Delete")}
          </Button>
        </div>
      </ModalDialog>
    </Modal>
  )
}
