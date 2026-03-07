import { yupResolver } from "@hookform/resolvers/yup"
import { api } from "@ui/api"
import { Button } from "@ui/components/Button"
import { CapsLockWarningMessage } from "@ui/components/CapsLockWarningMessage"
import { FormFieldContainer } from "@ui/components/FormFieldContainer"
import { FormFieldInputText } from "@ui/components/FormFieldInputText"
import { Modal } from "@ui/components/Modal"
import { ModalDialog } from "@ui/components/ModalDialog"
import { PasswordStrength } from "@ui/components/PasswordStrength"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { useAccounts } from "@ui/state/accounts"
import downloadJson from "@ui/util/downloadJson"
import { type FC, useCallback, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { Trans, useTranslation } from "react-i18next"
import * as yup from "yup"
import { PasswordUnlock, usePasswordUnlock } from "./PasswordUnlock"

export const ExportAllAccountsModal: FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation()

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={onClose}>
      <ModalDialog
        title={t("Export all accounts as JSON")}
        className="w-[50.3rem] max-w-full overflow-hidden"
        onClose={onClose}
      >
        <PasswordUnlock
          title={
            <div className="mb-8 text-body-secondary">
              {t("Please confirm your password to export your accounts.")}
            </div>
          }
        >
          <ExportAllAccountsForm onSuccess={onClose} />
        </PasswordUnlock>
      </ModalDialog>
    </Modal>
  )
}

type FormData = {
  newPw: string
  newPwConfirm: string
}

const ExportAllAccountsForm = ({ onSuccess }: { onSuccess?: () => void }) => {
  const { t } = useTranslation()
  const { password } = usePasswordUnlock()

  const schema = useMemo(
    () =>
      yup
        .object({
          newPw: yup
            .string()
            .required(" ")
            .min(6, t("Password must be at least 6 characters long")),
          newPwConfirm: yup
            .string()
            .required(" ")
            .oneOf([yup.ref("newPw")], t("Passwords must match!")),
        })
        .required(),
    [t]
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
    watch,
    setError,
    setValue,
  } = useForm<FormData>({
    mode: "onChange",
    resolver: yupResolver(schema),
  })

  const newPwWatch = watch("newPw")

  const submit = useCallback(
    async ({ newPw }: FormData) => {
      if (!password) return
      try {
        const { exportedJson } = await api.accountExportAll(password, newPw)
        downloadJson(exportedJson, "talisman-accounts")
        onSuccess?.()
      } catch (err) {
        setError("newPwConfirm", {
          message: (err as Error)?.message ?? "",
        })
      }
    },
    [setError, onSuccess, password]
  )

  useEffect(() => {
    return () => {
      setValue("newPw", "")
      setValue("newPwConfirm", "")
    }
  }, [setValue])

  if (!password) return null
  return (
    <div>
      <form onSubmit={handleSubmit(submit)}>
        <p className="my-8 text-body-secondary text-sm">
          <Trans t={t}>
            Set a password for your JSON export. We strongly suggest using a{" "}
            <span className="text-white">different password</span> from your Talisman wallet
            password. This avoids exposing your Talisman password to other wallets or applications.
          </Trans>
        </p>
        <p className="text-body-secondary text-sm">
          {t(
            "Please note that only polkadot.js compatible accounts with stored private keys can be exported. Hardware, QR-based, and watch-only accounts will not be exported."
          )}
        </p>
        <div className="mt-12">
          <div className="mb-6 flex h-[1.2em] items-center justify-between text-sm">
            <div className="text-body-disabled">
              {t("Password strength:")} <PasswordStrength password={newPwWatch} />
            </div>
            <div>
              <CapsLockWarningMessage />
            </div>
          </div>
          <FormFieldContainer error={errors.newPw?.message}>
            <FormFieldInputText
              {...register("newPw")}
              autoFocus
              placeholder={t("Enter New Password")}
              spellCheck={false}
              autoComplete="new-password"
              data-lpignore
              type="password"
              tabIndex={0}
            />
          </FormFieldContainer>
          <FormFieldContainer error={errors.newPwConfirm?.message}>
            <FormFieldInputText
              {...register("newPwConfirm")}
              placeholder={t("Confirm New Password")}
              spellCheck={false}
              autoComplete="off"
              data-lpignore
              type="password"
              tabIndex={0}
            />
          </FormFieldContainer>
        </div>
        <Button
          className="mt-12"
          type="submit"
          primary
          fullWidth
          disabled={!isValid}
          processing={isSubmitting}
        >
          {t("Export")}
        </Button>
      </form>
    </div>
  )
}

export const useExportAllAccountsModal = () => {
  const accounts = useAccounts()
  const { isOpen: isOpenExportAll, open: openExportAll, close: closeExportAll } = useOpenClose()

  const exportableAccounts = useMemo(
    () =>
      accounts.filter(
        (account) =>
          // export only keypair accounts, others have metadata that are specific to each wallet
          account.type === "keypair" &&
          // only export pjs compatible accounts to be compatible with pjs json format
          ["sr25519", "ed25519", "ecdsa", "ethereum"].includes(account.curve)
      ),
    [accounts]
  )

  return {
    isOpenExportAll,
    openExportAll,
    closeExportAll,
    canExportAll: !!exportableAccounts.length,
  }
}
