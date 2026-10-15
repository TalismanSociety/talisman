import type { AccountsCatalogTree } from "@core/domains/accounts/helpers.catalog"
import { yupResolver } from "@hookform/resolvers/yup"
import { getErrorMessage } from "@talismn/util"
import { api } from "@ui/api"
import { track } from "@ui/api/track"
import { Button } from "@ui/components/Button"
import { FormFieldContainer } from "@ui/components/FormFieldContainer"
import { FormFieldInputText } from "@ui/components/FormFieldInputText"
import { Modal } from "@ui/components/Modal"
import { ModalDialog } from "@ui/components/ModalDialog"
import { createGlobalOpenClose } from "@ui/hooks/createGlobalOpenClose"
import { type RefCallback, useCallback, useEffect, useMemo, useRef } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import * as yup from "yup"

type FolderProps = {
  id: string
  name: string
  treeName: AccountsCatalogTree
}

const [useRenameFolderOpenClose] = createGlobalOpenClose<FolderProps>()

export const useRenameFolderModal = () => {
  const { isOpen, open: _open, close, args } = useRenameFolderOpenClose()
  const { id = null, name = null, treeName = null } = args ?? {}

  const open = useCallback(
    (id: string, name: string, treeName: AccountsCatalogTree) => _open({ id, name, treeName }),
    [_open]
  )

  return {
    id,
    name,
    treeName,
    isOpen,
    open,
    close,
  }
}

export const RenameFolderModal = () => {
  const { t } = useTranslation()
  const { id, name, treeName, close, isOpen } = useRenameFolderModal()

  return (
    <Modal analyticsId="rename_folder" containerId="main" isOpen={isOpen} onDismiss={close}>
      <ModalDialog className="h-auto" title={t("Rename Folder")} onCloseClick={close}>
        {id !== null && name !== null && treeName !== null && (
          <RenameFolder
            id={id}
            name={name}
            treeName={treeName}
            onConfirm={close}
            onCancel={close}
          />
        )}
      </ModalDialog>
    </Modal>
  )
}

type FormData = {
  name: string
}

interface RenameFolderProps {
  id: string
  name: string
  treeName: AccountsCatalogTree
  onConfirm: () => void
  onCancel: () => void
  className?: string
}

const RenameFolder = ({
  id,
  name,
  treeName,
  onConfirm,
  onCancel,
  className,
}: RenameFolderProps) => {
  const { t } = useTranslation()

  const schema = useMemo(
    () =>
      yup
        .object({
          name: yup.string().required(" "),
        })
        .required(),
    []
  )
  const defaultValues = useMemo(() => ({ name }), [name])

  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors, isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "onChange",
    defaultValues,
    resolver: yupResolver(schema),
  })

  const submit = useCallback(
    async ({ name: newName }: FormData) => {
      try {
        await api.accountsCatalogRunActions([{ type: "renameFolder", tree: treeName, id, newName }])
        track("item_renamed", { item: "folder" })
        onConfirm()
      } catch (err) {
        setError("name", {
          type: "validate",
          message: getErrorMessage(err, t("Unknown error")),
        })
      }
    },
    [id, onConfirm, setError, treeName, t]
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

  useEffect(() => {
    setFocus("name")
  }, [setFocus])

  return (
    <form className={className} onSubmit={handleSubmit(submit)}>
      <FormFieldContainer field="name" label={t("Folder name")} error={errors.name?.message}>
        <FormFieldInputText
          {...registerName}
          ref={handleNameRef}
          placeholder={t("Choose a name")}
        />
      </FormFieldContainer>
      <div className="mt-12 grid grid-cols-2 gap-8">
        <Button onClick={onCancel}>{t("Cancel")}</Button>
        <Button type="submit" primary disabled={!isValid} processing={isSubmitting}>
          {t("Rename")}
        </Button>
      </div>
    </form>
  )
}
