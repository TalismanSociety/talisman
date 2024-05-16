import { AccountAddressType, Chain, SubstrateLedgerAppType } from "@extension/core"
import { yupResolver } from "@hookform/resolvers/yup"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { classNames } from "@talismn/util"
import { AccountTypeSelector } from "@ui/domains/Account/AccountTypeSelector"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { useLedgerChains } from "@ui/hooks/ledger/useLedgerChains"
import {
  SubstrateMigrationApp,
  useLedgerSubstrateMigrationApp,
  useLedgerSubstrateMigrationApps,
} from "@ui/hooks/ledger/useLedgerSubstrateMigrationApps"
import useChain from "@ui/hooks/useChain"
import { useAllChains } from "@ui/hooks/useChains"
import { DEBUG } from "extension-shared"
import { FC, ReactNode, useCallback, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Button, Dropdown } from "talisman-ui"
import * as yup from "yup"

import { useAddLedgerAccount } from "./context"
import { ConnectLedgerEthereum } from "./Shared/ConnectLedgerEthereum"
import { ConnectLedgerPolkadot } from "./Shared/ConnectLedgerPolkadot"
import { ConnectLedgerSubstrateGeneric } from "./Shared/ConnectLedgerSubstrateGeneric"
import { ConnectLedgerSubstrateLegacy } from "./Shared/ConnectLedgerSubstrateLegacy"
import { ConnectLedgerSubstrateMigration } from "./Shared/ConnectLedgerSubstrateMigration"

type FormData = {
  chainId: string
  type: AccountAddressType
  migrationAppName?: string
  substrateAppType: SubstrateLedgerAppType
}

const renderSubstrateLegacyOption = (chain: Chain) => {
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

const renderSubstrateMigrationOption = (app: SubstrateMigrationApp) => (
  <div className="flex max-w-full items-center gap-5 overflow-hidden">
    <ChainLogo id={app.chain?.id} className="text-[1.25em]" />
    <span className="overflow-hidden text-ellipsis whitespace-nowrap">{app.name}</span>
  </div>
)

const SubstrateLegacyNetworkSelect: FC<{
  chain: Chain | null
  onChange: (chain: Chain | null) => void
}> = ({ chain, onChange }) => {
  const { t } = useTranslation("admin")
  const ledgerChains = useLedgerChains()

  return (
    <>
      <h2 className="text-body-disabled leading-paragraph mb-6 mt-12 text-base">
        {t("2. Choose Network")}
      </h2>
      <Dropdown
        propertyKey="id"
        items={ledgerChains}
        value={chain}
        placeholder={t("Select a network")}
        renderItem={renderSubstrateLegacyOption}
        onChange={onChange}
      />
      <p className="text-body-disabled mt-6 text-sm">
        {t("Please note: a legacy Ledger account can only be used on a single network.")}
      </p>
    </>
  )
}

const SubstrateMigrationNetworkSelect: FC<{
  app: SubstrateMigrationApp | null
  onChange: (app: SubstrateMigrationApp | null) => void
}> = ({ app, onChange }) => {
  const { t } = useTranslation("admin")
  const apps = useLedgerSubstrateMigrationApps()

  return (
    <>
      <h2 className="text-body-disabled leading-paragraph mb-6 mt-12 text-base">
        {t("2. Choose Network")}
      </h2>
      <Dropdown
        propertyKey="name"
        items={apps}
        value={app}
        placeholder={t("Select a network")}
        renderItem={renderSubstrateMigrationOption}
        onChange={onChange}
      />
      <p className="text-body-disabled mt-6 text-sm">
        {t(
          "Please note: you should not be sending any funds to a Ledger Migration app account. It's only meant to help you transfer your assets to Ledger Generic App accounts"
        )}
      </p>
    </>
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

  const allChains = useAllChains()
  const enableMigrationApp = DEBUG || allChains.some((chain) => chain.hasCheckMetadataHash)

  const navigate = useNavigate()
  const ledgerChains = useLedgerChains()
  const migrationApps = useLedgerSubstrateMigrationApps()

  const schema = useMemo(
    () =>
      yup
        .object({
          type: yup.string().oneOf(["sr25519", "ethereum"], ""),
        })
        .required()
        .test("validateFormData", t("Invalid parameters"), async (val, ctx) => {
          const { type, chainId, migrationAppName, substrateAppType } = val as FormData
          if (type === "sr25519") {
            if (!substrateAppType)
              return ctx.createError({
                path: "substrateAppType",
                message: t("App type not set"),
                type: "required",
              })
            if (substrateAppType === SubstrateLedgerAppType.Legacy) {
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
            if (substrateAppType === SubstrateLedgerAppType.Migration) {
              if (!migrationAppName)
                return ctx.createError({
                  path: "migrationAppName",
                  message: t("Migration app not set"),
                })
              if (!migrationApps.find((app) => app.name === migrationAppName))
                return ctx.createError({
                  path: "migrationAppName",
                  message: t("Migration app not supported"),
                })
            }
          }
          return true
        }),
    [ledgerChains, migrationApps, t]
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

  const [accountType, chainId, migrationAppName, substrateAppType] = watch([
    "type",
    "chainId",
    "migrationAppName",
    "substrateAppType",
  ])

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

  const handleMigrationAppChange = useCallback(
    (app: SubstrateMigrationApp | null) => {
      setValue("migrationAppName", app?.name, { shouldValidate: true })
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

  const migrationApp = useLedgerSubstrateMigrationApp(migrationAppName)

  const [isLedgerReady, setIsLedgerReady] = useState(false)

  const showConnect =
    accountType === "ethereum" ||
    (accountType === "sr25519" &&
      (["polkadot", "substrate-generic"].includes(substrateAppType) ||
        (substrateAppType === SubstrateLedgerAppType.Legacy && !!chainId) ||
        (substrateAppType === SubstrateLedgerAppType.Migration && !!migrationAppName)))

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
                selected={substrateAppType === SubstrateLedgerAppType.Generic}
                onClick={handleSubstrateAppTypeClick(SubstrateLedgerAppType.Generic)}
              />
              <AppVersionButton
                title={t("Legacy Apps")}
                description={t("Network-specific substrate apps")}
                selected={substrateAppType === SubstrateLedgerAppType.Legacy}
                onClick={handleSubstrateAppTypeClick(SubstrateLedgerAppType.Legacy)}
              />
              <AppVersionButton
                title={t("Recovery App")}
                description={t("Coming soon")}
                selected={substrateAppType === SubstrateLedgerAppType.Migration}
                onClick={handleSubstrateAppTypeClick(SubstrateLedgerAppType.Migration)}
                disabled={!enableMigrationApp}
              />
            </div>
            {/* <div className="mt-8">
              <button
                type="button"
                className={classNames(
                  substrateAppType === SubstrateLedgerAppType.Polkadot && "text-alert-success"
                )}
                onClick={handleSubstrateAppTypeClick(SubstrateLedgerAppType.Polkadot)}
              >
                {"@zondax/ledger-polkadot"}
              </button>
            </div> */}
            {substrateAppType === "substrate-legacy" && (
              <SubstrateLegacyNetworkSelect chain={chain} onChange={handleNetworkChange} />
              // <>
              //   <h2 className="text-body-disabled leading-paragraph mb-6 mt-12 text-base">
              //     {t("2. Choose Network")}
              //   </h2>
              //   <Dropdown
              //     propertyKey="id"
              //     items={ledgerChains}
              //     value={chain}
              //     placeholder={t("Select a network")}
              //     renderItem={renderOption}
              //     onChange={handleNetworkChange}
              //   />
              //   <p className="text-body-disabled mt-6 text-sm">
              //     {t("Please note: a legacy Ledger account can only be used on a single network.")}
              //   </p>
              // </>
            )}
            {substrateAppType === "substrate-migration" && (
              <SubstrateMigrationNetworkSelect
                app={migrationApp}
                onChange={handleMigrationAppChange}
              />
            )}
          </div>
        )}
        <div className={classNames("mt-16 h-[20rem]", showConnect ? "visible" : "invisible")}>
          {showConnect && accountType === "sr25519" && (
            <>
              {substrateAppType === SubstrateLedgerAppType.Legacy && (
                <ConnectLedgerSubstrateLegacy
                  className="min-h-[11rem]"
                  onReadyChanged={setIsLedgerReady}
                  chainId={chainId}
                />
              )}
              {substrateAppType === SubstrateLedgerAppType.Migration && (
                <ConnectLedgerSubstrateMigration
                  className="min-h-[11rem]"
                  onReadyChanged={setIsLedgerReady}
                  migrationAppName={migrationAppName}
                />
              )}
              {substrateAppType === SubstrateLedgerAppType.Generic && (
                <ConnectLedgerSubstrateGeneric
                  className="min-h-[11rem]"
                  onReadyChanged={setIsLedgerReady}
                />
              )}
              {substrateAppType === SubstrateLedgerAppType.Polkadot && (
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
