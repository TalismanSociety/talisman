import { AccountJsonAny } from "@core/domains/accounts/types"
import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { useAccountExport } from "@ui/hooks/useAccountExport"
import styled from "styled-components"
import { PasswordUnlock } from "./PasswordUnlock"
import { yupResolver } from "@hookform/resolvers/yup"
import { FormField } from "@talisman/components/Field/FormField"
import { Button, Checkbox } from "talisman-ui"
import { useCallback } from "react"
import { useForm } from "react-hook-form"
import * as yup from "yup"
import { PasswordStrength } from "@talisman/components/PasswordStrength"

type FormData = {
  newPw: string
  newPwConfirm: string
}

const schema = yup
  .object({
    newPw: yup.string().required("").min(6, "Password must be at least 6 characters long"),
    newPwConfirm: yup
      .string()
      .required("")
      .oneOf([yup.ref("newPw")], "Passwords must match!"),
  })
  .required()

const ExportAccountForm = ({
  account,
  onSuccess,
}: {
  account: AccountJsonAny
  onSuccess?: () => void
}) => {
  const { canExportAccount, exportAccount } = useAccountExport(account)
  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
    watch,
    setError,
  } = useForm<FormData>({
    mode: "onChange",
    resolver: yupResolver(schema),
  })

  const newPwWatch = watch("newPw")

  const submit = useCallback(
    async ({ newPw }: FormData) => {
      try {
        await exportAccount(newPw)
        onSuccess && onSuccess()
      } catch (err) {
        setError("newPwConfirm", {
          message: (err as Error)?.message ?? "",
        })
      }
    },
    [exportAccount, setError, onSuccess]
  )

  if (!canExportAccount) return null
  return (
    <div>
      <form onSubmit={handleSubmit(submit)}>
        <p className="text-body-secondary my-8 text-sm">
          Set a password for your JSON export. We strongly suggest using a{" "}
          <span className="text-white">different password</span> from your Talisman wallet password.
          This avoids exposing your Talisman password to other wallets or applications.
        </p>

        <div className="mt-12">
          <div className="text-body-disabled mb-8 text-sm">
            Password strength: <PasswordStrength password={newPwWatch} />
          </div>
          <FormField error={errors.newPw} className="mb-12">
            <input
              {...register("newPw")}
              placeholder="Enter New Password"
              spellCheck={false}
              autoComplete="new-password"
              data-lpignore
              type="password"
              tabIndex={2}
            />
          </FormField>
          <FormField error={errors.newPwConfirm} className="mb-12">
            <input
              {...register("newPwConfirm")}
              placeholder="Confirm New Password"
              spellCheck={false}
              autoComplete="off"
              data-lpignore
              type="password"
              tabIndex={3}
            />
          </FormField>
        </div>
        <Button
          className="mt-12"
          type="submit"
          primary
          fullWidth
          disabled={!isValid}
          processing={isSubmitting}
        >
          Export
        </Button>
      </form>
    </div>
  )
}

type ExportAccountModalProps = {
  account: AccountJsonAny
  isOpen: boolean
  close: () => void
}

const Dialog = styled(ModalDialog)`
  width: 50.3rem;
`

export const ExportAccountModal = ({ isOpen, close, account }: ExportAccountModalProps) => {
  return (
    <Modal open={isOpen} onClose={close}>
      <Dialog title="Export account JSON" onClose={close}>
        <PasswordUnlock
          description={
            <div className="text-body-secondary mb-8">
              Please confirm your password to export your account.
            </div>
          }
        >
          <ExportAccountForm account={account} onSuccess={close} />
        </PasswordUnlock>
      </Dialog>
    </Modal>
  )
}
