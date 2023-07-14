import { AccountsCatalogTree } from "@core/domains/accounts/types"
import { yupResolver } from "@hookform/resolvers/yup"
import Dialog from "@talisman/components/Dialog"
import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import useAccountsCatalog from "@ui/hooks/useAccountsCatalog"
import { RefCallback, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import styled from "styled-components"
import { FormFieldContainer, FormFieldInputText } from "talisman-ui"
import * as yup from "yup"

const useRenameFolderModalProvider = () => {
  const [name, setName] = useState<string | null>(null)
  const [treeName, setTreeName] = useState<AccountsCatalogTree | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback((name: string, treeName: AccountsCatalogTree) => {
    setName(name)
    setTreeName(treeName)
    setIsOpen(true)
  }, [])
  const close = useCallback(() => setIsOpen(false), [])

  useEffect(() => {
    close()
  }, [close])

  return {
    name,
    treeName,
    isOpen,
    open,
    close,
  }
}

export const [RenameFolderModalProvider, useRenameFolderModal] = provideContext(
  useRenameFolderModalProvider
)

export const RenameFolderModal = () => {
  const { t } = useTranslation("admin")
  const { name, treeName, close, isOpen } = useRenameFolderModal()

  return (
    <Modal open={isOpen}>
      <ModalDialog title={t("Rename Folder")} onClose={close}>
        {name !== null && treeName !== null && (
          <RenameFolder name={name} treeName={treeName} onConfirm={close} onCancel={close} />
        )}
      </ModalDialog>
    </Modal>
  )
}

const StyledDialog = styled(Dialog)`
  .error {
    font-size: var(--font-size-small);
    color: var(--color-status-warning);
    height: 1.6em;
    margin-bottom: -1.6em;
  }
`

type FormData = {
  name: string
}

interface RenameFolderProps {
  name: string
  treeName: AccountsCatalogTree
  onConfirm: () => void
  onCancel: () => void
  className?: string
}

const RenameFolder = ({ name, treeName, onConfirm, onCancel, className }: RenameFolderProps) => {
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
    formState: { errors, isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "onChange",
    defaultValues,
    resolver: yupResolver(schema),
  })

  const catalog = useAccountsCatalog()
  const submit = useCallback(
    async ({ name: newName }: FormData) => {
      const tree = catalog[treeName]
      if (tree.some((item) => item.type === "folder" && item.name === newName)) {
        return setError("name", {
          type: "validate",
          message: t("A folder with this name already exists."),
        })
      }

      try {
        await api.accountsCatalogMutate([{ type: "renameFolder", tree: treeName, name, newName }])
        onConfirm()
      } catch (err) {
        setError("name", {
          type: "validate",
          message: (err as Error)?.message ?? "",
        })
      }
    },
    [catalog, name, onConfirm, setError, t, treeName]
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
    <StyledDialog
      className={className}
      text={t("Folder name")}
      extra={
        <form onSubmit={handleSubmit(submit)}>
          <FormFieldContainer error={errors.name?.message}>
            <FormFieldInputText
              {...registerName}
              ref={handleNameRef}
              placeholder={t("Choose a name")}
              spellCheck={false}
              autoComplete="off"
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              data-lpignore
            />
          </FormFieldContainer>
        </form>
      }
      confirmText={t("Save")}
      cancelText={t("Cancel")}
      onConfirm={handleSubmit(submit)}
      onCancel={onCancel}
      confirmDisabled={!isValid}
      confirming={isSubmitting}
    />
  )
}
