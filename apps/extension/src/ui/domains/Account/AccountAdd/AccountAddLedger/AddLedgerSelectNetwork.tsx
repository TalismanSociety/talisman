import { yupResolver } from "@hookform/resolvers/yup"
import { classNames } from "@talismn/util"
import { t } from "i18next"
import { FC, ReactNode, useCallback, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Button, Dropdown } from "talisman-ui"
import * as yup from "yup"

import { Chain, UiAccountAddressType } from "@extension/core"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { AccountTypeSelector } from "@ui/domains/Account/AccountTypeSelector"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import {
  ChainWithLedgerApp,
  useLedgerSubstrateChain,
  useLedgerSubstrateChains,
} from "@ui/hooks/ledger/useLedgerSubstrateChains"
import { isAddSubstrateLedgerAppType, isUiAccountAddressType } from "@ui/util/typeCheckers"

import { AddSubstrateLedgerAppType, useAddLedgerAccount } from "./context"
import { ConnectLedgerEthereum } from "./Shared/ConnectLedgerEthereum"
import { ConnectLedgerSubstrateGeneric } from "./Shared/ConnectLedgerSubstrateGeneric"
import { ConnectLedgerSubstrateLegacy } from "./Shared/ConnectLedgerSubstrateLegacy"

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
        "bg-field text-body-secondary group flex min-h-60 flex-col gap-5 rounded border p-8 text-left",
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

const renderSubstratNetworkOption = (chain: Chain) => (
  <div className="flex max-w-full items-center gap-5 overflow-hidden">
    <ChainLogo id={chain?.id} className="text-[1.25em]" />
    <span className="overflow-hidden text-ellipsis whitespace-nowrap">{chain.name}</span>
  </div>
)

const SubstrateNetworkSelect: FC<{
  chain?: ChainWithLedgerApp | null
  onSelect: (chain: ChainWithLedgerApp | null) => void
}> = ({ chain, onSelect }) => {
  const ledgerChains = useLedgerSubstrateChains()

  return (
    <Dropdown
      propertyKey="id"
      items={ledgerChains}
      value={chain}
      placeholder={t("Select a network")}
      renderItem={renderSubstratNetworkOption}
      onChange={onSelect}
    />
  )
}

export const AddLedgerSelectNetwork = () => {
  const { t } = useTranslation("admin")
  const { data: defaultValues, updateData } = useAddLedgerAccount()

  const chains = useLedgerSubstrateChains()

  const navigate = useNavigate()

  const schema = useMemo(
    () =>
      yup
        .object({
          type: yup.mixed(isUiAccountAddressType).defined(),
          chainId: yup.string(),
          substrateAppType: yup.mixed(isAddSubstrateLedgerAppType),
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
            if (!chainId)
              return ctx.createError({
                path: "chainId",
                message: t("Network not set"),
              })
            const chain = chains.find((c) => c.id === chainId)
            if (!chain?.supportedLedgerApps.includes(substrateAppType))
              return ctx.createError({
                path: "chainId",
                message: t("Network not supported"),
              })
          }
          return true
        }),
    [chains, t]
  )

  const {
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "onChange",
    defaultValues: defaultValues as FormData,
    resolver: yupResolver(schema),
  })

  type FormData = yup.InferType<typeof schema>

  const [accountType, chainId, substrateAppType] = watch(["type", "chainId", "substrateAppType"])

  const chain = useLedgerSubstrateChain(chainId ?? (defaultValues.chainId as string))

  const submit = useCallback(
    async ({ type, chainId, substrateAppType }: FormData) => {
      updateData({ type, chainId, substrateAppType })
      navigate("account")
    },
    [navigate, updateData]
  )

  const handleNetworkChange = useCallback(
    (chain: Chain | null) => {
      reset({
        type: "sr25519",
        chainId: chain?.id,
      })
    },
    [reset]
  )

  const handleTypeChange = useCallback(
    (type: UiAccountAddressType) => {
      reset({ type })
    },
    [reset]
  )

  const handleSubstrateAppTypeClick = useCallback(
    (appType: AddSubstrateLedgerAppType) => () => {
      setValue("substrateAppType", appType, {
        shouldValidate: true,
      })
    },
    [setValue]
  )

  const [isLedgerReady, setIsLedgerReady] = useState(false)

  const showConnect = accountType === "ethereum" || (accountType === "sr25519" && substrateAppType)

  return (
    <form className="flex h-full max-h-screen flex-col" onSubmit={handleSubmit(submit)}>
      <div className="flex-grow">
        <HeaderBlock
          title={t("Connect Ledger")}
          text={t("What type of account would you like to connect?")}
        />
        <Spacer small />
        <AccountTypeSelector defaultType={accountType} onChange={handleTypeChange} />
        {accountType === "sr25519" && (
          <>
            <div className="bg-black-secondary mt-12 rounded p-12">
              <h2 className="text-body-secondary leading-paragraph text-base">
                {t("1. Choose Network")}
              </h2>
              <div className="mt-6">
                <SubstrateNetworkSelect chain={chain} onSelect={handleNetworkChange} />
              </div>
            </div>
            {!!chain && (
              <div className="bg-black-secondary mt-12 rounded p-12">
                <h2 className="text-body-secondary leading-paragraph text-base">
                  {t("2. Choose Ledger App")}
                </h2>
                <div className="mt-6 grid grid-cols-3 gap-8">
                  {chain.supportedLedgerApps.includes(AddSubstrateLedgerAppType.Generic) && (
                    <AppVersionButton
                      title={t("Polkadot App")}
                      description={t("Supports multiple substrate networks")}
                      extra={
                        <span
                          className={classNames(
                            "bg-green/10 text-green rounded-[1.2rem] px-4 py-1",
                            chain?.hasCheckMetadataHash ? "visible" : "invisible"
                          )}
                        >
                          {t("Recommended")}
                        </span>
                      }
                      selected={substrateAppType === AddSubstrateLedgerAppType.Generic}
                      onClick={handleSubstrateAppTypeClick(AddSubstrateLedgerAppType.Generic)}
                    />
                  )}
                  {chain.supportedLedgerApps.includes(AddSubstrateLedgerAppType.Legacy) && (
                    <AppVersionButton
                      title={`${chain.ledgerAppName} App`}
                      description={t("Network-specific app")}
                      selected={substrateAppType === AddSubstrateLedgerAppType.Legacy}
                      onClick={handleSubstrateAppTypeClick(AddSubstrateLedgerAppType.Legacy)}
                    />
                  )}
                  {chain.supportedLedgerApps.includes(AddSubstrateLedgerAppType.Migration) && (
                    <AppVersionButton
                      title={t("Migration App")}
                      description={t("Recover your assets from the deprecated {{appName}} app.", {
                        appName: chain.ledgerAppName,
                      })}
                      selected={substrateAppType === AddSubstrateLedgerAppType.Migration}
                      onClick={handleSubstrateAppTypeClick(AddSubstrateLedgerAppType.Migration)}
                    />
                  )}
                </div>
              </div>
            )}
          </>
        )}
        <div className={classNames("mt-16 h-[20rem]", showConnect ? "visible" : "invisible")}>
          {showConnect && accountType === "sr25519" && chainId && (
            <>
              {substrateAppType === AddSubstrateLedgerAppType.Legacy && (
                <ConnectLedgerSubstrateLegacy
                  className="min-h-[11rem]"
                  onReadyChanged={setIsLedgerReady}
                  chainId={chainId}
                />
              )}

              {substrateAppType === AddSubstrateLedgerAppType.Generic && (
                <ConnectLedgerSubstrateGeneric
                  className="min-h-[11rem]"
                  onReadyChanged={setIsLedgerReady}
                />
              )}
              {substrateAppType === AddSubstrateLedgerAppType.Migration && (
                <ConnectLedgerSubstrateGeneric
                  className="min-h-[11rem]"
                  onReadyChanged={setIsLedgerReady}
                  appName={chain?.ledgerAppName}
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
