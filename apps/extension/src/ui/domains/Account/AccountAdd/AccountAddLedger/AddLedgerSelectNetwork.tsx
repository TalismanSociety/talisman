import { AccountAddressType, Chain, SubstrateLedgerAppType } from "@extension/core"
import { yupResolver } from "@hookform/resolvers/yup"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { classNames } from "@talismn/util"
import { AccountTypeSelector } from "@ui/domains/Account/AccountTypeSelector"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { useLedgerChains } from "@ui/hooks/ledger/useLedgerChains"
import useChain from "@ui/hooks/useChain"
import { FC, ReactNode, useCallback, useMemo, useState } from "react"
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
  const getChainLabel = (chain: Chain) => {
    switch (chain.id) {
      case "polkadot-asset-hub":
        return "Polkadot Asset Hub (Statemint)"
      case "kusama-asset-hub":
        return "Kusama Asset Hub (Statemine)"
      default:
        return chain.name
    }
  }

  return (
    <div className="flex max-w-full items-center gap-5 overflow-hidden">
      <ChainLogo id={chain.id} className="text-[1.25em]" />
      <span className="overflow-hidden text-ellipsis whitespace-nowrap">
        {getChainLabel(chain)}
      </span>
    </div>
  )
}

const AppVersionButton: FC<{
  title: ReactNode
  description: ReactNode
  extra?: ReactNode
  selected?: boolean
  disabled?: boolean
  onClick?: () => void
}> = ({ title, description, extra, selected, disabled, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "bg-field text-body-secondary group flex flex-col gap-5 rounded border p-8 text-left",
        "disabled:cursor-not-allowed disabled:opacity-50",
        selected
          ? "border-body bg-grey-800"
          : "border-body-disabled enabled:hover:border-body-secondary enabled:hover:bg-grey-800"
      )}
      disabled={disabled}
    >
      <div
        className={classNames(
          "group-enabled:group-hover:text-body text-base",
          selected && "text-body"
        )}
      >
        {title}
      </div>
      <div className="text-xs">{description}</div>
      {extra && <div className="text-xs">{extra}</div>}
    </button>
  )
}

export const AddLedgerSelectNetwork = () => {
  const { t } = useTranslation("admin")
  const { data: defaultValues, updateData } = useAddLedgerAccount()

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

  const [accountType, chainId, substrateAppType] = watch(["type", "chainId", "substrateAppType"])

  const submit = useCallback(
    async ({ type, chainId, substrateAppType }: FormData) => {
      updateData({ type, chainId, substrateAppType })
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

  const handleSubstrateAppTypeClick = useCallback(
    (type: SubstrateLedgerAppType) => () => {
      setValue("substrateAppType", type, {
        shouldValidate: true,
      })
    },
    [setValue]
  )

  const chain = useChain(chainId ?? (defaultValues.chainId as string))

  const [isLedgerReady, setIsLedgerReady] = useState(false)

  const showStep2 =
    accountType === "ethereum" ||
    (accountType === "sr25519" && (chainId || substrateAppType === "polkadot"))
  //     <AssetHubConflictWarning chain={chain} />
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
          <div className="bg-black-secondary mt-12 rounded p-12">
            <h2 className="text-body-disabled leading-paragraph text-base">
              {t("1. Choose Ledger App Version")}
            </h2>
            <div className="mt-6 grid grid-cols-3 gap-8">
              <AppVersionButton
                title={t("Polkadot App")}
                description={t("Supports all substrate networks")}
                extra={
                  <span className="bg-green/10 text-green rounded-[1.2rem] px-4 py-1">
                    {t("Recommended")}
                  </span>
                }
                selected={substrateAppType === "polkadot"}
                onClick={handleSubstrateAppTypeClick("polkadot")}
              />
              <AppVersionButton
                title={t("Legacy Apps")}
                description={t("Network-specific substrate apps")}
                selected={substrateAppType === "substrate-legacy"}
                onClick={handleSubstrateAppTypeClick("substrate-legacy")}
              />
              <AppVersionButton title={t("Recovery App")} description={t("Coming soon")} disabled />
            </div>
            {substrateAppType === "substrate-legacy" && (
              <>
                <h2 className="text-body-disabled leading-paragraph mb-6 mt-12 text-base">
                  {t("2. Choose Network")}
                </h2>
                <Dropdown
                  propertyKey="id"
                  items={ledgerChains}
                  value={chain}
                  placeholder={t("Select a network")}
                  renderItem={renderOption}
                  onChange={handleNetworkChange}
                />
                <p className="text-body-disabled mt-6 text-sm">
                  {t("Please note: a legacy Ledger account can only be used on a single network.")}
                </p>
              </>
            )}
          </div>
        )}
        <div className={classNames("mt-16 h-[20rem]", showStep2 ? "visible" : "invisible")}>
          {showStep2 && accountType === "sr25519" && (
            <>
              {substrateAppType === "substrate-legacy" && (
                <ConnectLedgerSubstrateLegacy
                  className="min-h-[11rem]"
                  onReadyChanged={setIsLedgerReady}
                  chainId={chainId}
                />
              )}
              {substrateAppType === "polkadot" && (
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
