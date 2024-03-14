import { AccountsCatalogTree } from "@extension/core"
import { yupResolver } from "@hookform/resolvers/yup"
import { api } from "@ui/api"
import { atom, useAtom } from "jotai"
import { RefCallback, useCallback, useEffect, useMemo, useRef } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Button, Modal, ModalDialog } from "talisman-ui"
import { FormFieldContainer, FormFieldInputText } from "talisman-ui"
import * as yup from "yup"

const renameFolderModalOpenState = atom(false)
const renameFolderItemState = atom<{
  id: string | null
  name: string | null
  treeName: AccountsCatalogTree | null
}>({ id: null, name: null, treeName: null })

export const useRenameFolderModal = () => {
  const [{ id, name, treeName }, setFolderItem] = useAtom(renameFolderItemState)
  const [isOpen, setIsOpen] = useAtom(renameFolderModalOpenState)

  const open = useCallback(
    (id: string, name: string, treeName: AccountsCatalogTree) => {
      setFolderItem({ id, name, treeName })
      setIsOpen(true)
    },
    [setFolderItem, setIsOpen]
  )
  const close = useCallback(() => setIsOpen(false), [setIsOpen])

  useEffect(() => {
    close()
  }, [close])

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
  const { t } = useTranslation("admin")
  const { id, name, treeName, close, isOpen } = useRenameFolderModal()

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <ModalDialog title={t("Rename Folder")} onClose={close}>
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
  const { t } = useTranslation("admin")

  const schema = useMemo(
    () =>
      yup
        .object({
          name: yup.string().required(""),
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
        onConfirm()
      } catch (err) {
        setError("name", {
          type: "validate",
          message: (err as Error)?.message ?? "",
        })
      }
    },
    [id, onConfirm, setError, treeName]
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
      <FormFieldContainer label={t("Folder name")} error={errors.name?.message}>
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
