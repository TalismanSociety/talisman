import { yupResolver } from "@hookform/resolvers/yup"
import { api } from "@ui/api"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import useAccounts from "@ui/hooks/useAccounts"
import { FC, RefCallback, useCallback, useEffect, useMemo, useRef } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Button, FormFieldContainer, FormFieldInputText } from "talisman-ui"
import * as yup from "yup"

type FormData = {
  name: string
}

export const AccountRename: FC<{
  address: string
  onConfirm: () => void
  onCancel: () => void
}> = ({ address, onConfirm, onCancel }) => {
  const { t } = useTranslation()
  const account = useAccountByAddress(address)

  const allAccounts = useAccounts()
  const otherAccountNames = useMemo(
    () => allAccounts.filter((a) => a.address !== address).map((a) => a.name),
    [address, allAccounts]
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
      name: account?.name,
    }),
    [account]
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

  const submit = useCallback(
    async ({ name }: FormData) => {
      try {
        await api.accountRename(address, name)
        onConfirm()
      } catch (err) {
        setError("name", {
          type: "validate",
          message: (err as Error)?.message ?? "",
        })
      }
    },
    [address, onConfirm, setError]
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
        label={t("Choose a new name for this account")}
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
        <Button type="submit" primary disabled={!isValid} processing={isSubmitting}>
          {t("Rename")}
        </Button>
      </div>
    </form>
  )
}
