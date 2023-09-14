import { yupResolver } from "@hookform/resolvers/yup"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { Mnemonic, useMnemonic, useMnemonics } from "@ui/hooks/useMnemonics"
import { FC, RefCallback, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Button, FormFieldContainer, FormFieldInputText, ModalDialog } from "talisman-ui"
import { Modal } from "talisman-ui"
import * as yup from "yup"

type FormData = {
  name: string
}

const MnemonicRenameForm: FC<{
  mnemonic: Mnemonic
  onConfirm: () => void
  onCancel: () => void
}> = ({ mnemonic, onConfirm, onCancel }) => {
  const { t } = useTranslation("admin")

  const allMnemonics = useMnemonics()
  const otherAccountNames = useMemo(
    () => allMnemonics.filter((m) => m.id !== mnemonic.id).map((a) => a.name),
    [allMnemonics, mnemonic.id]
  )

  const schema = useMemo(
    () =>
      yup
        .object({
          name: yup.string().required("").notOneOf(otherAccountNames, t("Name already in use")),
        })
        .required(),
    [otherAccountNames, t]
  )

  const defaultValues = useMemo(
    () => ({
      name: mnemonic?.name,
    }),
    [mnemonic?.name]
  )

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isValid },
  } = useForm<FormData>({
    mode: "onChange",
    defaultValues,
    resolver: yupResolver(schema),
  })

  const submit = useCallback(
    async ({ name }: FormData) => {
      try {
        await api.mnemonicRename(mnemonic.id, name)
        onConfirm()
      } catch (err) {
        setError("name", {
          type: "validate",
          message: (err as Error)?.message ?? "",
        })
      }
    },
    [mnemonic.id, onConfirm, setError]
  )

  // "manual" field registration so we can hook our own ref to it
  const { ref: refName, ...registerName } = register("name")

  // on mount, auto select the input's text
  const refNameRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    const input = refNameRef.current as HTMLInputElement
    if (input) {
      input.select()
      input.focus()
    }
  }, [])

  // plug both refs to the input component
  const handleNameRef: RefCallback<HTMLInputElement> = useCallback(
    (e: HTMLInputElement | null) => {
      refName(e)
      refNameRef.current = e
    },
    [refName]
  )

  return (
    <form onSubmit={handleSubmit(submit)}>
      <FormFieldContainer
        label={t("Choose a new name for this recovery phrase")}
        error={errors.name?.message}
      >
        <FormFieldInputText
          {...registerName}
          ref={handleNameRef}
          placeholder={t("Choose a name")}
          spellCheck={false}
          autoComplete="off"
          data-lpignore
        />
      </FormFieldContainer>
      <div className="mt-12 grid grid-cols-2 gap-8">
        <Button onClick={onCancel}>{t("Cancel")}</Button>
        <Button type="submit" primary disabled={!isValid}>
          {t("Rename")}
        </Button>
      </div>
    </form>
  )
}

const useMnemonicRenameModalProvider = () => {
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

  return {
    mnemonic,
    isOpen,
    open,
    close,
  }
}

export const [MnemonicRenameModalProvider, useMnemonicRenameModal] = provideContext(
  useMnemonicRenameModalProvider
)

export const MnemonicRenameModal = () => {
  const { t } = useTranslation("admin")
  const { mnemonic, close, isOpen } = useMnemonicRenameModal()

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <ModalDialog title={t("Rename recovery phrase")} onClose={close}>
        {!!mnemonic && (
          <MnemonicRenameForm mnemonic={mnemonic} onConfirm={close} onCancel={close} />
        )}
      </ModalDialog>
    </Modal>
  )
}
