import { yupResolver } from "@hookform/resolvers/yup"
import { sleep } from "@talismn/util"
import { LedgerEthDerivationPathType, LedgerSolDerivationPathType } from "extension-core"
import { toPairs } from "lodash-es"
import { FC, useCallback, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Navigate } from "react-router-dom"
import { Button, Dropdown } from "talisman-ui"
import * as yup from "yup"

import { notify, notifyUpdate } from "@talisman/components/Notifications"
import { LedgerEthereumAccountPicker } from "@ui/domains/Account/LedgerEthereumAccountPicker"
import { CHAIN_ID_TO_LEDGER_APP_NAME } from "@ui/hooks/ledger/common"
import { useLedgerSubstrateAppByName } from "@ui/hooks/ledger/useLedgerSubstrateApp"

import { LedgerPolkadotAccountPicker } from "../../LedgerPolkadotAccountPicker"
import { LedgerPolkadotLegacyAccountPicker } from "../../LedgerPolkadotLegacyAccountPicker"
import { LedgerSolanaAccountPicker } from "../../LedgerSolanaAccountPicker"
import { AddSubstrateLedgerAppType, LedgerAccountDef, useAddLedgerAccount } from "./context"

const ledgerEthDerivationPathOptions: Record<LedgerEthDerivationPathType, string> = {
  LedgerLive: "Ledger Live",
  Legacy: "Legacy (MEW, MyCrypto)",
  BIP44: "BIP44 Standard (MetaMask, Trezor)",
}

const LedgerEthDerivationPathSelector: FC<{
  derivationPathType: LedgerEthDerivationPathType
  onChange: (value: LedgerEthDerivationPathType) => void
}> = ({ derivationPathType = "LedgerLive", onChange }) => {
  const options = useMemo(() => {
    return toPairs(ledgerEthDerivationPathOptions).map(([key, value]) => ({
      key: key as LedgerEthDerivationPathType,
      label: value,
    }))
  }, [])

  const value = useMemo(
    () => options.find((i) => i.key === derivationPathType),
    [options, derivationPathType],
  )

  const handleChange = useCallback(
    (item: { key: LedgerEthDerivationPathType; label: string } | null) => {
      if (item) onChange(item.key)
    },
    [onChange],
  )

  return (
    <Dropdown
      items={options}
      value={value}
      propertyKey="key"
      propertyLabel="label"
      onChange={handleChange}
    />
  )
}

const ledgerSolDerivationPathOptions: Record<LedgerSolDerivationPathType, string> = {
  "ledger-live": "Ledger Live",
  "classic": "Classic (Phantom, Solflare)",
}

const LedgerSolDerivationPathSelector: FC<{
  derivationPathType: LedgerSolDerivationPathType
  onChange: (value: LedgerSolDerivationPathType) => void
}> = ({ derivationPathType = "ledger-live", onChange }) => {
  const options = useMemo(() => {
    return toPairs(ledgerSolDerivationPathOptions).map(([key, value]) => ({
      key: key as LedgerSolDerivationPathType,
      label: value,
    }))
  }, [])

  const value = useMemo(
    () => options.find((i) => i.key === derivationPathType),
    [options, derivationPathType],
  )

  const handleChange = useCallback(
    (item: { key: LedgerSolDerivationPathType; label: string } | null) => {
      if (item) onChange(item.key)
    },
    [onChange],
  )

  return (
    <Dropdown
      items={options}
      value={value}
      propertyKey="key"
      propertyLabel="label"
      onChange={handleChange}
    />
  )
}

type FormData = {
  accounts: LedgerAccountDef[]
}

export const AddLedgerSelectAccount = () => {
  const { t } = useTranslation()
  const { data, connectAccounts: importAccounts, onSuccess } = useAddLedgerAccount()

  const app = useLedgerSubstrateAppByName(CHAIN_ID_TO_LEDGER_APP_NAME[data.chainId as string])

  const schema = useMemo(
    () =>
      yup
        .object({
          accounts: yup.array().of(yup.mixed<LedgerAccountDef>().defined()).min(1).defined(),
        })
        .required(),
    [],
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
          title: t("Connecting account", { count: accounts.length }),
          subtitle: t("Please wait"),
        },
        { autoClose: false },
      )

      // pause to prevent double notification
      await sleep(1000)

      try {
        const addresses = await importAccounts(accounts)
        notifyUpdate(notificationId, {
          type: "success",
          title: t("Account connected", { count: accounts.length }),
          subtitle: null,
        })
        onSuccess(addresses[0])
      } catch (err) {
        notifyUpdate(notificationId, {
          type: "error",
          title: t("Connecting account", { count: accounts.length }),
          subtitle: (err as Error).message,
        })
      }
    },
    [importAccounts, onSuccess, t],
  )

  const handleAccountsChange = useCallback(
    (accounts: LedgerAccountDef[]) => {
      setValue("accounts", accounts, { shouldValidate: true })
    },
    [setValue],
  )

  const [ethDerivationPathType, setEthDerivationPathType] =
    useState<LedgerEthDerivationPathType>("LedgerLive")
  const [solDerivationPathType, setSolDerivationPathType] =
    useState<LedgerSolDerivationPathType>("ledger-live")

  const isInvalidInputs = useMemo(() => {
    if (!data.platform) return true
    if (data.platform === "polkadot" && !data.substrateAppType) return true
    if (
      data.platform === "polkadot" &&
      data.substrateAppType === AddSubstrateLedgerAppType.Legacy &&
      !data.chainId
    )
      return true
    return false
  }, [data.chainId, data.substrateAppType, data.platform])

  if (isInvalidInputs) return <Navigate to="/accounts/add/ledger" replace />

  return (
    <form className="flex flex-col gap-12" onSubmit={handleSubmit(submit)}>
      <div className="flex-grow">
        <h1 className="m-0">{t("Connect Ledger")}</h1>
        {(data.platform === "ethereum" || data.platform === "solana") && (
          <>
            <p className="text-body-secondary mb-12 mt-[1em]">
              {t(
                "The derivation path will be different based on which application you used to initialise your Ledger account.",
              )}
            </p>
            <div>
              {data.platform === "ethereum" && (
                <LedgerEthDerivationPathSelector
                  derivationPathType={ethDerivationPathType}
                  onChange={setEthDerivationPathType}
                />
              )}
              {data.platform === "solana" && (
                <LedgerSolDerivationPathSelector
                  derivationPathType={solDerivationPathType}
                  onChange={setSolDerivationPathType}
                />
              )}
            </div>
            <div className="h-4" />
          </>
        )}
        <p className="text-body-secondary mb-12 mt-[1em]">
          {t("Please select which account(s) you'd like to connect.")}
          {data.platform === "ethereum" && (
            <>
              <br />
              {t(
                "Amounts displayed for each account only include the most popular tokens on major networks.",
              )}
            </>
          )}
        </p>
        {data.platform === "polkadot" && (
          <>
            {data.substrateAppType === AddSubstrateLedgerAppType.Legacy && (
              <LedgerPolkadotLegacyAccountPicker
                chainId={data.chainId as string}
                onChange={handleAccountsChange}
              />
            )}
            {data.substrateAppType === AddSubstrateLedgerAppType.Generic && (
              <LedgerPolkadotAccountPicker onChange={handleAccountsChange} chainId={data.chainId} />
            )}
            {data.substrateAppType === AddSubstrateLedgerAppType.Migration && !!app && (
              <LedgerPolkadotAccountPicker
                onChange={handleAccountsChange}
                app={app}
                chainId={data.chainId}
              />
            )}
          </>
        )}
        {data.platform === "ethereum" && (
          <LedgerEthereumAccountPicker
            name={t("Ledger Ethereum")}
            derivationPathType={ethDerivationPathType}
            onChange={handleAccountsChange}
          />
        )}
        {data.platform === "solana" && (
          <LedgerSolanaAccountPicker
            name={t("Ledger Solana")}
            derivationPathType={solDerivationPathType}
            onChange={handleAccountsChange}
          />
        )}
      </div>
      <div className="flex justify-end">
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
    </form>
  )
}
