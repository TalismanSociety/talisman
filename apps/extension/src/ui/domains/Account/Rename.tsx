import { yupResolver } from "@hookform/resolvers/yup"
import Dialog from "@talisman/components/Dialog"
import { api } from "@ui/api"
import useAccountByAddress from "@ui/hooks/useAccountByAddress"
import useAccounts from "@ui/hooks/useAccounts"
import { RefCallback, useCallback, useEffect, useMemo, useRef } from "react"
import { useForm } from "react-hook-form"
import styled from "styled-components"
import { FormFieldContainer, FormFieldInputText } from "talisman-ui"
import * as yup from "yup"

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

interface IAccountRename {
  address: string
  onConfirm: () => void
  onCancel: () => void
  className?: string
}

const AccountRename = ({ address, onConfirm, onCancel, className }: IAccountRename) => {
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
          name: yup.string().required("").notOneOf(otherAccountNames, "Name already in use"),
        })
        .required(),
    [otherAccountNames]
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
    <StyledDialog
      className={className}
      text="Choose a new name for this account"
      extra={
        <form onSubmit={handleSubmit(submit)}>
          <FormFieldContainer error={errors.name?.message}>
            <FormFieldInputText
              {...registerName}
              ref={handleNameRef}
              placeholder="Choose a name"
              spellCheck={false}
              autoComplete="off"
              autoFocus
              data-lpignore
            />
          </FormFieldContainer>
        </form>
      }
      confirmText="Rename"
      cancelText="Cancel"
      onConfirm={handleSubmit(submit)}
      onCancel={onCancel}
      confirmDisabled={!isValid}
      confirming={isSubmitting}
    />
  )
}

export default AccountRename
