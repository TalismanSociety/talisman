import { yupResolver } from "@hookform/resolvers/yup"
import { classNames } from "@talismn/util"
import { DEBUG } from "extension-shared"
import { FC, ReactNode, useCallback, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Button, Dropdown } from "talisman-ui"
import * as yup from "yup"

import { AccountAddressType, Chain } from "@extension/core"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
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

import { AddSubstrateLedgerAppType, useAddLedgerAccount } from "./context"
import { ConnectLedgerEthereum } from "./Shared/ConnectLedgerEthereum"
import { ConnectLedgerSubstrateGeneric } from "./Shared/ConnectLedgerSubstrateGeneric"
import { ConnectLedgerSubstrateLegacy } from "./Shared/ConnectLedgerSubstrateLegacy"

type FormData = {
  chainId: string
  type: AccountAddressType
  migrationAppName?: string
  substrateAppType: AddSubstrateLedgerAppType
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

  // ignore the ones that have the CheclMetadataHash extension, as those need the generic (or migration) Ledger app
  const legacyLedgerChains = useMemo(
    () => ledgerChains.filter((chain) => !chain.hasCheckMetadataHash),
    [ledgerChains]
  )

  return (
    <>
      <h2 className="text-body-disabled leading-paragraph mb-6 mt-12 text-base">
        {t("2. Choose Network")}
      </h2>
      <Dropdown
        propertyKey="id"
        items={legacyLedgerChains}
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

  // These apps are meant for funds recovery on derivation paths which may hold assets on other chains than the originally intended one.
  // Therefore none of them should be filtered out.

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
      <div className="text-alert-warn mt-6 flex flex-col gap-4">
        <h2 className="text-base">{t("Notes on Ledger Migration App accounts")}</h2>
        <p className="text-sm">
          {t(
            "Please do not send any assets to a Ledger Migration app account. These accounts are only intended to help you recover and transfer your assets to Ledger Generic App accounts."
          )}
        </p>
        <p className="text-sm">
          {t(
            "Before you can send funds from accounts created with this app, the network needs to perform a runtime upgrade. Please check with the network team before proceeding."
          )}
        </p>
      </div>
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
            if (substrateAppType === AddSubstrateLedgerAppType.Legacy) {
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
            if (substrateAppType === AddSubstrateLedgerAppType.Migration) {
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
    async ({ type, chainId, substrateAppType, migrationAppName }: FormData) => {
      updateData({ type, chainId, substrateAppType, migrationAppName })
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
    (type: AddSubstrateLedgerAppType) => () => {
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
      (substrateAppType === AddSubstrateLedgerAppType.Generic ||
        (substrateAppType === AddSubstrateLedgerAppType.Legacy && !!chainId) ||
        (substrateAppType === AddSubstrateLedgerAppType.Migration && !!migrationApp)))

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
                selected={substrateAppType === AddSubstrateLedgerAppType.Generic}
                onClick={handleSubstrateAppTypeClick(AddSubstrateLedgerAppType.Generic)}
              />
              <AppVersionButton
                title={t("Legacy Apps")}
                description={t("Network-specific substrate apps")}
                selected={substrateAppType === AddSubstrateLedgerAppType.Legacy}
                onClick={handleSubstrateAppTypeClick(AddSubstrateLedgerAppType.Legacy)}
              />
              <AppVersionButton
                title={t("Migration App")}
                description={t("Recover your assets from deprecated Ledger apps.")}
                selected={substrateAppType === AddSubstrateLedgerAppType.Migration}
                onClick={handleSubstrateAppTypeClick(AddSubstrateLedgerAppType.Migration)}
                disabled={!enableMigrationApp}
              />
            </div>

            {substrateAppType === AddSubstrateLedgerAppType.Legacy && (
              <SubstrateLegacyNetworkSelect chain={chain} onChange={handleNetworkChange} />
            )}
            {substrateAppType === AddSubstrateLedgerAppType.Migration && (
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
              {substrateAppType === AddSubstrateLedgerAppType.Migration && !!migrationApp && (
                <ConnectLedgerSubstrateGeneric
                  className="min-h-[11rem]"
                  onReadyChanged={setIsLedgerReady}
                  app={migrationApp}
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
