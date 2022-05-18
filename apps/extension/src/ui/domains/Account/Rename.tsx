import { useCallback, useMemo } from "react"
import styled from "styled-components"
import Dialog from "@talisman/components/Dialog"
import useAccountByAddress from "@ui/hooks/useAccountByAddress"
import useAccounts from "@ui/hooks/useAccounts"
import * as yup from "yup"
import { useForm } from "react-hook-form"
import { yupResolver } from "@hookform/resolvers/yup"
import { api } from "@ui/api"
import { FormField } from "@talisman/components/Field/FormField"

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

  return (
    <StyledDialog
      className={className}
      title="Enter a new name"
      text="Choose a new name for this account"
      extra={
        <form onSubmit={handleSubmit(submit)}>
          <FormField error={errors.name}>
            <input
              {...register("name")}
              placeholder="Choose a name"
              spellCheck={false}
              autoComplete="off"
              autoFocus
              data-lpignore
            />
          </FormField>
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
