import { AccountJsonAny, AccountType } from "@extension/core"
import { yupResolver } from "@hookform/resolvers/yup"
import { CapsLockWarningMessage } from "@talisman/components/CapsLockWarningMessage"
import { PasswordStrength } from "@talisman/components/PasswordStrength"
import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"
import downloadJson from "@talisman/util/downloadJson"
import { api } from "@ui/api"
import { atom, useAtom } from "jotai"
import { useCallback, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { Trans, useTranslation } from "react-i18next"
import { ModalDialog } from "talisman-ui"
import { Modal } from "talisman-ui"
import { Button, FormFieldContainer, FormFieldInputText } from "talisman-ui"
import * as yup from "yup"

import { useSelectedAccount } from "../Portfolio/useSelectedAccount"
import { PasswordUnlock, usePasswordUnlock } from "./PasswordUnlock"

const accountExportAccountState = atom<AccountJsonAny | null>(null)

export const useAccountExportModal = () => {
  const [_account, setAccount] = useAtom(accountExportAccountState)

  const { account: selectedAccount } = useSelectedAccount()
  const { isOpen, open: innerOpen, close } = useGlobalOpenClose("accountExportModal")

  const open = useCallback(
    (account?: AccountJsonAny) => {
      setAccount(account ?? null)
      innerOpen()
    },
    [innerOpen, setAccount]
  )

  const account = _account ?? selectedAccount

  const canExportAccountFunc = (account?: AccountJsonAny) =>
    account?.origin === AccountType.Talisman

  const canExportAccount = useMemo(() => canExportAccountFunc(account), [account])

  const exportAccount = useCallback(
    async (password: string, newPw: string) => {
      if (!account) return
      const { exportedJson } = await api.accountExport(account.address, password, newPw)
      downloadJson(exportedJson, `${exportedJson.meta?.name || "talisman"}`)
    },
    [account]
  )

  return { account, canExportAccountFunc, canExportAccount, exportAccount, isOpen, open, close }
}

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

  useEffect(() => {
    return () => {
      setValue("newPw", "")
      setValue("newPwConfirm", "")
    }
  }, [setValue])

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
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <ModalDialog title={t("Export account JSON")} className="w-[50.3rem]" onClose={close}>
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
