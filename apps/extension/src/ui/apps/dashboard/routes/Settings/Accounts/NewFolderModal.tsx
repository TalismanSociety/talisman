import { AccountsCatalogTree } from "@core/domains/accounts/types"
import { yupResolver } from "@hookform/resolvers/yup"
import Dialog from "@talisman/components/Dialog"
import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import useAccountsCatalog from "@ui/hooks/useAccountsCatalog"
import { RefCallback, useCallback, useEffect, useMemo, useRef } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import styled from "styled-components"
import { Checkbox, FormFieldContainer, FormFieldInputText } from "talisman-ui"
import * as yup from "yup"

const useNewFolderModalProvider = () => {
  const { isOpen, open, close } = useOpenClose()

  useEffect(() => {
    close()
  }, [close])

  return {
    isOpen,
    open,
    close,
  }
}

export const [NewFolderModalProvider, useNewFolderModal] = provideContext(useNewFolderModalProvider)

export const NewFolderModal = () => {
  const { t } = useTranslation("admin")
  const { close, isOpen } = useNewFolderModal()

  return (
    <Modal open={isOpen}>
      <ModalDialog title={t("New Folder")} onClose={close}>
        <NewFolder onConfirm={close} onCancel={close} />
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
  followedOnly?: boolean
}

interface NewFolderProps {
  onConfirm: () => void
  onCancel: () => void
  className?: string
}

const NewFolder = ({ onConfirm, onCancel, className }: NewFolderProps) => {
  const { t } = useTranslation("admin")

  const schema = useMemo(
    () =>
      yup
        .object({
          name: yup.string().required(""),
          followedOnly: yup.boolean(),
        })
        .required(),
    []
  )

  const defaultValues = useMemo(
    () => ({
      name: "",
      followedOnly: false,
    }),
    []
  )

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
    async ({ name, followedOnly }: FormData) => {
      const treeName: AccountsCatalogTree = followedOnly ? "watched" : "portfolio"
      const tree = catalog[treeName]
      if (tree.some((item) => item.type === "folder" && item.name === name)) {
        return setError("name", {
          type: "validate",
          message: t("A folder with this name already exists."),
        })
      }

      try {
        await api.accountsCatalogMutate([{ type: "addFolder", tree: treeName, name }])
        onConfirm()
      } catch (err) {
        setError("name", {
          type: "validate",
          message: (err as Error)?.message ?? "",
        })
      }
    },
    [catalog, onConfirm, setError, t]
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
          {catalog.watched.length > 0 && (
            <Checkbox {...register("followedOnly")}>Followed only</Checkbox>
          )}
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
