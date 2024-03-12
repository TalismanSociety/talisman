import { RequestAccountCreateFromSuri } from "@extension/core"
import { yupResolver } from "@hookform/resolvers/yup"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { notify, notifyUpdate } from "@talisman/components/Notifications"
import { DerivedFromMnemonicAccountPicker } from "@ui/domains/Account/DerivedFromMnemonicAccountPicker"
import { useCallback, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Navigate, useNavigate } from "react-router-dom"
import { Button } from "talisman-ui"
import * as yup from "yup"

import { useAccountAddSecret } from "./context"

type FormData = {
  accounts: RequestAccountCreateFromSuri[]
}

export const AccountAddMnemonicAccountsForm = () => {
  const { t } = useTranslation("admin")
  const { data, importAccounts, onSuccess } = useAccountAddSecret()
  const navigate = useNavigate()

  const name = useMemo(
    () => data.name ?? (data.type === "ethereum" ? t("Ethereum Account") : t("Polkadot Account")),
    [data.name, data.type, t]
  )

  const schema = useMemo(
    () =>
      yup
        .object({
          accounts: yup.array().min(1),
        })
        .required(),
    []
  )

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "onChange",
    defaultValues: data,
    resolver: yupResolver(schema),
  })

  const submit = useCallback(
    async ({ accounts }: FormData) => {
      const notificationId = notify(
        {
          type: "processing",
          title: t("Importing {{count}} accounts", { count: accounts.length }),
          subtitle: "Please wait",
        },
        { autoClose: false }
      )
      try {
        const addresses = await importAccounts(accounts)

        notifyUpdate(notificationId, {
          type: "success",
          title: t("{{count}} accounts imported", { count: accounts.length }),
          subtitle: null,
        })

        onSuccess(addresses[0])
      } catch (err) {
        notifyUpdate(notificationId, {
          type: "error",
          title: t("Failed to import", { count: accounts.length }),
          subtitle: (err as Error).message,
        })
      }
    },
    [importAccounts, onSuccess, t]
  )

  const handleAccountsChange = useCallback(
    (accounts: RequestAccountCreateFromSuri[]) => {
      setValue("accounts", accounts, { shouldValidate: true })
    },
    [setValue]
  )

  useEffect(() => {
    if (!data.mnemonic || !data.type) return navigate("/accounts/add/mnemonic")
  }, [data.mnemonic, data.type, navigate])

  const accounts = watch("accounts")
  // invalid state, useEffect above will redirect to previous form
  if (!data.mnemonic || !data.type) return <Navigate to="/accounts/add/mnemonic" replace />

  return (
    <div className="flex w-full flex-col gap-8">
      <HeaderBlock
        title={t("Import account(s)")}
        text={t("Please select which account(s) you'd like to import.")}
      />
      <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-8">
        <div className="h-[42rem]">
          <DerivedFromMnemonicAccountPicker
            name={name}
            mnemonic={data.mnemonic}
            type={data.type}
            onChange={handleAccountsChange}
          />
        </div>
        <div className="flex w-full justify-end">
          <Button
            className="w-[24rem]"
            type="submit"
            primary
            disabled={!isValid}
            processing={isSubmitting}
          >
            {t("Import")} {accounts?.length || ""}
          </Button>
        </div>
      </form>
    </div>
  )
}
