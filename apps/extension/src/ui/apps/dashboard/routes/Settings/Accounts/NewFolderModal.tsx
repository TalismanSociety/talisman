import { AccountsCatalogTree } from "@extension/core"
import { yupResolver } from "@hookform/resolvers/yup"
import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"
import { api } from "@ui/api"
import { useAccountsCatalog } from "@ui/hooks/useAccountsCatalog"
import { RefCallback, useCallback, useEffect, useMemo, useRef } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Button, Modal, ModalDialog } from "talisman-ui"
import { Checkbox, FormFieldContainer, FormFieldInputText } from "talisman-ui"
import * as yup from "yup"

export const useNewFolderModal = () => useGlobalOpenClose("newFolderModal")

export const NewFolderModal = () => {
  const { t } = useTranslation("admin")
  const { close, isOpen } = useNewFolderModal()

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <ModalDialog title={t("New Folder")} onClose={close}>
        <NewFolder onConfirm={close} onCancel={close} />
      </ModalDialog>
    </Modal>
  )
}

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
    setFocus,
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

      try {
        await api.accountsCatalogRunActions([{ type: "addFolder", tree: treeName, name }])
        onConfirm()
      } catch (err) {
        setError("name", {
          type: "validate",
          message: (err as Error)?.message ?? "",
        })
      }
    },
    [onConfirm, setError]
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
      {catalog.watched.length > 0 && (
        <Checkbox {...register("followedOnly")}>
          {t("Add this folder to my followed only section")}
        </Checkbox>
      )}
      <div className="mt-12 grid grid-cols-2 gap-8">
        <Button onClick={onCancel}>{t("Cancel")}</Button>
        <Button type="submit" primary disabled={!isValid} processing={isSubmitting}>
          {t("Save")}
        </Button>
      </div>
    </form>
  )
}
