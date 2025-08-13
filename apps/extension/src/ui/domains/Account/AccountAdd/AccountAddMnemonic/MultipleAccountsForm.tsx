import { AddAccountDeriveOptions } from "extension-core"
import { startCase } from "lodash-es"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Navigate, useNavigate } from "react-router-dom"
import { Button } from "talisman-ui"

import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { notify, notifyUpdate } from "@talisman/components/Notifications"
import { api } from "@ui/api"
import { DerivedFromMnemonicAccountPicker } from "@ui/domains/Account/DerivedFromMnemonicAccountPicker"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"

import { useAccountAddMnemonic } from "./context"

export const AccountAddMnemonicAccountsForm = () => {
  const { t } = useTranslation()
  const { data } = useAccountAddMnemonic()
  const [accountsToImport, setAccountsToImport] = useState<AddAccountDeriveOptions[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")

  const name = useMemo(
    () => data.name ?? t("{{curve}} Account", { curve: startCase(data.curve) }),
    [data.name, data.curve, t],
  )

  const onSubmit = useCallback(async () => {
    setIsSubmitting(true)
    const notificationId = notify(
      {
        type: "processing",
        title: t("Importing {{count}} accounts", { count: accountsToImport.length }),
        subtitle: "Please wait",
      },
      { autoClose: false },
    )
    try {
      const addresses = await api.accountAddDerive(accountsToImport)

      notifyUpdate(notificationId, {
        type: "success",
        title: t("{{count}} accounts imported", { count: accountsToImport.length }),
        subtitle: null,
      })

      setAddress(addresses[0])
    } catch (err) {
      notifyUpdate(notificationId, {
        type: "error",
        title: t("Failed to import", { count: accountsToImport.length }),
        subtitle: (err as Error).message,
      })
      setIsSubmitting(false)
    }
  }, [accountsToImport, setAddress, t])

  const handleAccountsChange = useCallback((accounts: AddAccountDeriveOptions[]) => {
    setAccountsToImport(accounts)
  }, [])

  useEffect(() => {
    if (!data.mnemonic || !data.curve) return navigate("/accounts/add/mnemonic")
  }, [data.mnemonic, data.curve, navigate])

  if (!data.mnemonic || !data.curve) return <Navigate to="/accounts/add/mnemonic" replace />

  return (
    <div className="flex w-full flex-col gap-8">
      <HeaderBlock
        title={t("Import account(s)")}
        text={t("Please select which account(s) you'd like to import.")}
      />
      <div className="flex flex-col gap-8">
        <div className="h-[42rem]">
          <DerivedFromMnemonicAccountPicker
            name={name}
            mnemonic={data.mnemonic}
            curve={data.curve}
            onChange={handleAccountsChange}
          />
        </div>
        <div className="flex w-full justify-end">
          <Button
            className="w-[24rem]"
            primary
            disabled={!accountsToImport.length}
            processing={isSubmitting}
            onClick={onSubmit}
          >
            {t("Import")} {accountsToImport?.length || ""}
          </Button>
        </div>
      </div>
    </div>
  )
}
