import { AccountJsonAny } from "@core/domains/accounts/types"
import { yupResolver } from "@hookform/resolvers/yup"
import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { PasswordStrength } from "@talisman/components/PasswordStrength"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import downloadJson from "@talisman/util/downloadJson"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { useCallback, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { Trans, useTranslation } from "react-i18next"
import { Button, FormFieldContainer, FormFieldInputText } from "talisman-ui"
import * as yup from "yup"

import { useSelectedAccount } from "../Portfolio/SelectedAccountContext"
import { PasswordUnlock, usePasswordUnlock } from "./PasswordUnlock"

const EXPORTABLE_ORIGINS: AccountJsonAny["origin"][] = ["SEED", "JSON", "DERIVED"]

const useAccountExportModalProvider = () => {
  const { account } = useSelectedAccount()
  const { isOpen, open, close } = useOpenClose()

  useEffect(() => {
    close()
  }, [account, close])

  const canExportAccount = useMemo(
    () => account && EXPORTABLE_ORIGINS.includes(account?.origin),
    [account]
  )

  const exportAccount = useCallback(
    async (password: string, newPw: string) => {
      if (!account) return
      const { exportedJson } = await api.accountExport(account.address, password, newPw)
      downloadJson(exportedJson, `${exportedJson.meta?.name || "talisman"}`)
    },
    [account]
  )

  return { account, canExportAccount, exportAccount, isOpen, open, close }
}

export const [AccountExportModalProvider, useAccountExportModal] = provideContext(
  useAccountExportModalProvider
)

type FormData = {
  newPw: string
  newPwConfirm: string
}

const ExportAccountForm = ({ onSuccess }: { onSuccess?: () => void }) => {
  const { t } = useTranslation()
  const { canExportAccount, exportAccount } = useAccountExportModal()
  const { password } = usePasswordUnlock()

  const schema = useMemo(
    () =>
      yup
        .object({
          newPw: yup.string().required("").min(6, t("Password must be at least 6 characters long")),
          newPwConfirm: yup
            .string()
            .required("")
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
  } = useForm<FormData>({
    mode: "onChange",
    resolver: yupResolver(schema),
  })

  const newPwWatch = watch("newPw")

  const submit = useCallback(
    async ({ newPw }: FormData) => {
      if (!password) return
      try {
        await exportAccount(password, newPw)
        onSuccess && onSuccess()
      } catch (err) {
        setError("newPwConfirm", {
          message: (err as Error)?.message ?? "",
        })
      }
    },
    [exportAccount, setError, onSuccess, password]
  )

  if (!canExportAccount || !password) return null
  return (
    <div>
      <form onSubmit={handleSubmit(submit)}>
        <p className="text-body-secondary my-8 text-sm">
          <Trans t={t}>
            Set a password for your JSON export. We strongly suggest using a{" "}
            <span className="text-white">different password</span> from your Talisman wallet
            password. This avoids exposing your Talisman password to other wallets or applications.
          </Trans>
        </p>

        <div className="mt-12">
          <div className="text-body-disabled mb-8 text-sm">
            {t("Password strength:")} <PasswordStrength password={newPwWatch} />
          </div>
          <FormFieldContainer error={errors.newPw?.message}>
            <FormFieldInputText
              {...register("newPw")}
              // eslint-disable-next-line jsx-a11y/no-autofocus
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

export const AccountExportModal = () => {
  const { t } = useTranslation()
  const { isOpen, close } = useAccountExportModal()
  return (
    <Modal open={isOpen} onClose={close} className="w-[50.3rem]">
      <ModalDialog title="Export account JSON" onClose={close}>
        <PasswordUnlock
          title={
            <div className="text-body-secondary mb-8">
              {t("Please confirm your password to export your account.")}
            </div>
          }
        >
          <ExportAccountForm onSuccess={close} />
        </PasswordUnlock>
      </ModalDialog>
    </Modal>
  )
}
