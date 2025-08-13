import { yupResolver } from "@hookform/resolvers/yup"
import { DotNetwork } from "@talismn/chaindata-provider"
import { AccountPlatform } from "@talismn/crypto"
import { InfoIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { t } from "i18next"
import { FC, ReactNode, useCallback, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Button, Dropdown, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"
import * as yup from "yup"

import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { AccountPlatformSelector } from "@ui/domains/Account/AccountPlatformSelector"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import {
  ChainWithLedgerApp,
  useLedgerSubstrateChain,
  useLedgerSubstrateChains,
} from "@ui/hooks/ledger/useLedgerSubstrateChains"
import { isAddSubstrateLedgerAppType } from "@ui/util/typeCheckers"

import { AddSubstrateLedgerAppType, useAddLedgerAccount } from "./context"
import { ConnectLedgerEthereum } from "./Shared/ConnectLedgerEthereum"
import { ConnectLedgerSolana } from "./Shared/ConnectLedgerSolana"
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
          : "border-body-disabled enabled:hover:border-body-secondary enabled:hover:bg-grey-800",
      )}
      disabled={disabled}
    >
      <div
        className={classNames(
          "group-enabled:group-hover:text-body text-base",
          selected && "text-body",
        )}
      >
        {title}
      </div>
      <div className="text-xs">{description}</div>
      {extra && <div className="text-xs">{extra}</div>}
    </button>
  )
}

const renderSubstratNetworkOption = (chain: DotNetwork) => (
  <div className="flex max-w-full items-center gap-5 overflow-hidden">
    <NetworkLogo networkId={chain?.id} className="text-[1.25em]" />
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
  const { t } = useTranslation()
  const { data: defaultValues, updateData } = useAddLedgerAccount()

  const chains = useLedgerSubstrateChains()

  const navigate = useNavigate()

  const schema = useMemo(
    () =>
      yup
        .object({
          platform: yup
            .mixed<AccountPlatform>()
            .oneOf(["ethereum", "polkadot", "solana"])
            .defined(),
          chainId: yup.string(),
          substrateAppType: yup.mixed(isAddSubstrateLedgerAppType),
        })
        .required()
        .test("validateFormData", t("Invalid parameters"), async (val, ctx) => {
          const { platform, chainId, substrateAppType } = val as FormData
          if (platform === "polkadot") {
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
    [chains, t],
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

  const [platform, chainId, substrateAppType] = watch(["platform", "chainId", "substrateAppType"])

  const chain = useLedgerSubstrateChain(chainId ?? (defaultValues.chainId as string))
  const curve = useMemo(() => (chain?.account === "secp256k1" ? "ethereum" : "ed25519"), [chain])

  const submit = useCallback(
    async ({ platform, chainId, substrateAppType }: FormData) => {
      updateData({ platform, chainId, substrateAppType })
      navigate("account")
    },
    [navigate, updateData],
  )

  const handleNetworkChange = useCallback(
    (chain: DotNetwork | null) => {
      reset({
        platform: "polkadot",
        chainId: chain?.id,
      })
    },
    [reset],
  )

  const handlePlatformChange = useCallback(
    (platform: AccountPlatform) => {
      reset({ platform })
    },
    [reset],
  )

  const handleSubstrateAppTypeClick = useCallback(
    (appType: AddSubstrateLedgerAppType) => () => {
      setValue("substrateAppType", appType, {
        shouldValidate: true,
      })
    },
    [setValue],
  )

  const [isLedgerReady, setIsLedgerReady] = useState(false)

  const showConnect =
    platform === "solana" ||
    platform === "ethereum" ||
    (platform === "polkadot" && substrateAppType)

  return (
    <form className="flex flex-col" onSubmit={handleSubmit(submit)}>
      <div>
        <HeaderBlock
          title={t("Connect Ledger")}
          text={t("What type of account would you like to connect?")}
        />
        <Spacer small />
        <AccountPlatformSelector defaultValue={platform} onChange={handlePlatformChange} />
        {platform === "polkadot" && (
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
                <div className="flex justify-between">
                  <h2 className="text-body-secondary leading-paragraph text-base">
                    {t("2. Choose Ledger App")}
                  </h2>

                  {chain.supportedLedgerApps.length > 1 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-body-secondary flex items-center gap-2 align-middle text-xs">
                          <InfoIcon />
                          <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                            Which one should I choose?
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="rounded-xs text-body-secondary border-grey-700 z-20 max-w-[32rem] border-[0.5px] bg-black p-3 text-xs shadow">
                        <Trans
                          t={t}
                          defaults={
                            "<P><bold>Choose the Polkadot App</bold> if you want to create a new account on {{chainName}}, or want to access an existing account that was created with the Polkadot App.</P><P><bold>Choose the Migration App</bold> if you want to access an existing account that was previously created with the chain-specific {{chainName}} app. The purpose of the Migration app is to allow you to migrate your funds to the new generic Polkadot App.</P>"
                          }
                          components={{
                            P: <div className="mb-2"></div>,
                            bold: <span className="font-bold"></span>,
                          }}
                          values={{ chainName: chain.name }}
                        />
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <div className="mt-6 grid grid-cols-3 gap-8">
                  {chain.supportedLedgerApps.includes(AddSubstrateLedgerAppType.Generic) && (
                    <AppVersionButton
                      title={t("Polkadot App")}
                      description={t("Supports multiple substrate networks")}
                      extra={
                        <span
                          className={classNames(
                            "bg-green/10 text-green rounded-[1.2rem] px-4 py-1",
                            chain?.hasCheckMetadataHash ? "visible" : "invisible",
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
        <div className={classNames("mt-16 h-[12rem]", showConnect ? "visible" : "invisible")}>
          {showConnect && platform === "polkadot" && chainId && (
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
                  curve={curve}
                  className="min-h-[11rem]"
                  onReadyChanged={setIsLedgerReady}
                />
              )}
              {substrateAppType === AddSubstrateLedgerAppType.Migration && (
                <ConnectLedgerSubstrateGeneric
                  curve={curve}
                  className="min-h-[11rem]"
                  onReadyChanged={setIsLedgerReady}
                  legacyAppName={chain?.ledgerAppName}
                />
              )}
            </>
          )}
          {platform === "ethereum" && (
            <ConnectLedgerEthereum className="mt-14" onReadyChanged={setIsLedgerReady} />
          )}
          {platform === "solana" && (
            <ConnectLedgerSolana className="mt-14" onReadyChanged={setIsLedgerReady} />
          )}
        </div>
      </div>
      {!!platform && (
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
