import { AccountAddressType, SubstrateLedgerAppType } from "@core/domains/accounts/types"
import { Chain } from "@core/domains/chains/types"
import { yupResolver } from "@hookform/resolvers/yup"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { classNames } from "@talismn/util"
import { AccountTypeSelector } from "@ui/domains/Account/AccountTypeSelector"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { useLedgerChains } from "@ui/hooks/ledger/useLedgerChains"
import useChain from "@ui/hooks/useChain"
import { ChangeEventHandler, useCallback, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Button, Dropdown } from "talisman-ui"
import * as yup from "yup"

import { useAddLedgerAccount } from "./context"
import { ConnectLedgerEthereum } from "./Shared/ConnectLedgerEthereum"
import { ConnectLedgerPolkadot } from "./Shared/ConnectLedgerPolkadot"
import { ConnectLedgerSubstrateLegacy } from "./Shared/ConnectLedgerSubstrateLegacy"

type FormData = {
  chainId: string
  type: AccountAddressType
  substrateAppType: SubstrateLedgerAppType
}

const renderOption = (chain: Chain) => {
  return (
    <div className="flex max-w-full items-center gap-5 overflow-hidden">
      <ChainLogo id={chain.id} className="text-[1.25em]" />
      <span className="overflow-hidden text-ellipsis whitespace-nowrap">{chain.name}</span>
    </div>
  )
}

export const AddLedgerSelectNetwork = () => {
  const { t } = useTranslation("admin")
  const { data: defaultValues, updateData } = useAddLedgerAccount()
  const [substrateLedgerAppType, setSubstrateLedgerAppType] = useState<SubstrateLedgerAppType>()

  const navigate = useNavigate()
  const ledgerChains = useLedgerChains()

  const schema = useMemo(
    () =>
      yup
        .object({
          type: yup.string().oneOf(["sr25519", "ethereum"], ""),
        })
        .required()
        .test("validateFormData", t("Invalid parameters"), async (val, ctx) => {
          const { type, chainId, substrateAppType } = val as FormData
          if (type === "sr25519") {
            if (!substrateAppType)
              return ctx.createError({
                path: "substrateAppType",
                message: t("App type not set"),
                type: "required",
              })
            if (substrateAppType === "substrate-legacy") {
              if (!chainId)
                return ctx.createError({
                  path: "chainId",
                  message: t("Network not set"),
                })
              if (!ledgerChains.find((chain) => chain.id === chainId))
                return ctx.createError({
                  path: "chainId",
                  message: t("Network not supported"),
                })
            }
          }
          return true
        }),
    [ledgerChains, t]
  )

  const {
    handleSubmit,
    watch,
    setValue,
    formState: { isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "onChange",
    defaultValues,
    resolver: yupResolver(schema),
  })

  const [accountType, chainId] = watch(["type", "chainId"])

  const submit = useCallback(
    async ({ type, chainId }: FormData) => {
      updateData({ type, chainId })
      navigate("account")
    },
    [navigate, updateData]
  )

  const handleNetworkChange = useCallback(
    (chain: Chain | null) => {
      setValue("chainId", chain?.id as string, { shouldValidate: true })
    },
    [setValue]
  )

  const handleTypeChange = useCallback(
    (type: AccountAddressType) => {
      if (type === "ethereum") setValue("chainId", "")
      setValue("type", type, { shouldValidate: true })
    },
    [setValue]
  )

  const handleSubstrateAppTypeChange: ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    if (e.target.checked) setSubstrateLedgerAppType(e.target.value as SubstrateLedgerAppType)
  }, [])

  const chain = useChain(chainId ?? (defaultValues.chainId as string))

  const [isLedgerReady, setIsLedgerReady] = useState(false)

  const showStep2 =
    accountType === "ethereum" ||
    (accountType === "sr25519" && (chainId || substrateLedgerAppType === "polkadot"))

  return (
    <form className="flex h-full max-h-screen flex-col" onSubmit={handleSubmit(submit)}>
      <div className="flex-grow">
        <HeaderBlock
          title={t("Import from Ledger")}
          text={t("What type of account would you like to import ?")}
        />
        <Spacer small />
        <AccountTypeSelector defaultType={accountType} onChange={handleTypeChange} />
        {accountType === "sr25519" && (
          <>
            <h2 className="mb-8 mt-12 text-base">{t("Step 1")}</h2>
            <p className="text-body-secondary mt-6">
              {t("Select the Ledger app that you wish to connect:")}
            </p>
            <div className="mt-4">
              <input
                type="radio"
                name="substrate-app-type"
                id="polkadot"
                value="polkadot"
                onChange={handleSubstrateAppTypeChange}
              />
              <label htmlFor="polkadot" className="text-body-secondary ml-3">
                {t("Polkadot app (recommended)")}
              </label>
            </div>
            <div>
              <input
                type="radio"
                name="substrate-app-type"
                id="substrate-legacy"
                value="substrate-legacy"
                onChange={handleSubstrateAppTypeChange}
              />
              <label htmlFor="substrate-legacy" className="text-body-secondary ml-3">
                {t("Legacy Polkadot app (network specific)")}
              </label>
            </div>
            <div
              className={classNames(
                "mt-8",
                substrateLedgerAppType === "substrate-legacy" ? "visible" : "invisible"
              )}
            >
              <Dropdown
                propertyKey="id"
                items={ledgerChains}
                value={chain}
                placeholder={t("Select a network")}
                renderItem={renderOption}
                onChange={handleNetworkChange}
              />
              <p className="text-body-secondary mt-6">
                {t("Please note: a Ledger account can only be used on a single network.")}
              </p>
            </div>
          </>
        )}
        <div className={classNames("mt-12 h-[20rem]", showStep2 ? "visible" : "invisible")}>
          {showStep2 && accountType === "sr25519" && (
            <>
              <h2 className="mb-8 mt-0 text-base">{t("Step 2")}</h2>
              {substrateLedgerAppType === "substrate-legacy" && (
                <ConnectLedgerSubstrateLegacy
                  className="min-h-[11rem]"
                  onReadyChanged={setIsLedgerReady}
                  chainId={chainId}
                />
              )}
              {substrateLedgerAppType === "polkadot" && (
                <ConnectLedgerPolkadot
                  className="min-h-[11rem]"
                  onReadyChanged={setIsLedgerReady}
                />
              )}
            </>
          )}
          {accountType === "ethereum" && (
            <ConnectLedgerEthereum className="mt-14" onReadyChanged={setIsLedgerReady} />
          )}
        </div>
      </div>
      {!!accountType && (
        <div className="flex justify-end">
          <Button
            className="w-[24rem]"
            type="submit"
            primary
            disabled={!isLedgerReady || !isValid}
            processing={isSubmitting}
          >
            {t("Continue")}
          </Button>
        </div>
      )}
    </form>
  )
}
