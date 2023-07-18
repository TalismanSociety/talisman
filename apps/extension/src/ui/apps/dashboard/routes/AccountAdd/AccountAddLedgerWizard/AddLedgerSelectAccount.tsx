import { LedgerEthDerivationPathType } from "@core/domains/ethereum/types"
import { yupResolver } from "@hookform/resolvers/yup"
import { notify, notifyUpdate } from "@talisman/components/Notifications"
import { Spacer } from "@talisman/components/Spacer"
import { sleep } from "@talismn/util"
import { DashboardLayout } from "@ui/apps/dashboard/layout/DashboardLayout"
import { LedgerEthereumAccountPicker } from "@ui/domains/Account/LedgerEthereumAccountPicker"
import { LedgerSubstrateAccountPicker } from "@ui/domains/Account/LedgerSubstrateAccountPicker"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"
import { FC, useCallback, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Navigate } from "react-router-dom"
import { Button, Dropdown } from "talisman-ui"
import * as yup from "yup"

import { LedgerAccountDef, useAddLedgerAccount } from "./context"

const options: Record<LedgerEthDerivationPathType, string> = {
  LedgerLive: "Ledger Live",
  Legacy: "Legacy (MEW, MyCrypto)",
  BIP44: "BIP44 Standard (MetaMask, Trezor)",
}

type Option = { key: LedgerEthDerivationPathType; label: string }

const items = Object.entries(options).map<Option>(([key, value]) => ({
  key: key as LedgerEthDerivationPathType,
  label: value,
}))

type LedgerDerivationPathSelectorProps = {
  defaultValue: LedgerEthDerivationPathType
  onChange: (value: LedgerEthDerivationPathType) => void
}

const LedgerDerivationPathSelector: FC<LedgerDerivationPathSelectorProps> = ({
  defaultValue = "LedgerLive",
  onChange,
}) => {
  const defaultSelectedItem = useMemo(
    () => items.find((i) => i.key === defaultValue),
    [defaultValue]
  )

  const handleChange = useCallback(
    (item: Option | null) => {
      if (item) onChange(item.key)
    },
    [onChange]
  )

  return (
    <Dropdown
      items={items}
      value={defaultSelectedItem}
      propertyKey="key"
      propertyLabel="label"
      onChange={handleChange}
      className="w-[32rem]"
    />
  )
}

type FormData = {
  accounts: LedgerAccountDef[]
}

export const AddLedgerSelectAccount = () => {
  const { t } = useTranslation("admin")
  const { data, importAccounts } = useAddLedgerAccount()
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")

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
          title: t("Importing account", { count: accounts.length }),
          subtitle: t("Please wait"),
        },
        { autoClose: false }
      )

      // pause to prevent double notification
      await sleep(1000)

      try {
        const addresses = await importAccounts(accounts)
        notifyUpdate(notificationId, {
          type: "success",
          title: t("Account imported", { count: accounts.length }),
          subtitle: null,
        })
        setAddress(addresses[0])
      } catch (err) {
        notifyUpdate(notificationId, {
          type: "error",
          title: t("Importing account", { count: accounts.length }),
          subtitle: (err as Error).message,
        })
      }
    },
    [importAccounts, setAddress, t]
  )

  const handleAccountsChange = useCallback(
    (accounts: LedgerAccountDef[]) => {
      setValue("accounts", accounts, { shouldValidate: true })
    },
    [setValue]
  )

  const [derivationPath, setDerivationPath] = useState<LedgerEthDerivationPathType>("LedgerLive")

  if (!data.type) return <Navigate to="/accounts/add/ledger" replace />
  if (data.type === "sr25519" && !data.chainId)
    return <Navigate to="/accounts/add/ledger" replace />

  return (
    <DashboardLayout withBack centered>
      <form className="flex h-[53.4rem] max-h-screen flex-col" onSubmit={handleSubmit(submit)}>
        <div className="flex-grow">
          <h1 className="m-0">{t("Import from Ledger")}</h1>
          {data.type === "ethereum" && (
            <>
              <p className="text-body-secondary mb-12 mt-[1em]">
                {t(
                  "The derivation path will be different based on which application you used to initialise your Ledger account."
                )}
              </p>
              <div>
                <LedgerDerivationPathSelector
                  defaultValue="LedgerLive"
                  onChange={setDerivationPath}
                />
              </div>
              <div className="h-4" />
            </>
          )}
          <p className="text-body-secondary mb-12 mt-[1em]">
            {t("Please select which account(s) you'd like to import.")}
            {data.type === "ethereum" && (
              <>
                <br />
                {t("Amounts displayed for each account are the sum of GLMR, MOVR, ASTR and ETH.")}
              </>
            )}
          </p>
          {data.type === "sr25519" && (
            <LedgerSubstrateAccountPicker
              chainId={data.chainId as string}
              onChange={handleAccountsChange}
            />
          )}
          {data.type === "ethereum" && (
            <LedgerEthereumAccountPicker
              name={t("Ledger Ethereum")}
              derivationPathType={derivationPath}
              onChange={handleAccountsChange}
            />
          )}
        </div>
        <div className="mt-12 flex justify-end">
          <Button
            className="w-[24rem]"
            type="submit"
            primary
            disabled={!isValid}
            processing={isSubmitting}
          >
            {t("Continue")}
          </Button>
        </div>
        <Spacer />
      </form>
    </DashboardLayout>
  )
}
