import { AccountAddressType, Chain } from "@extension/core"
import { yupResolver } from "@hookform/resolvers/yup"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { classNames } from "@talismn/util"
import { AccountTypeSelector } from "@ui/domains/Account/AccountTypeSelector"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { useLedgerChains } from "@ui/hooks/ledger/useLedgerChains"
import useAccounts from "@ui/hooks/useAccounts"
import useChain from "@ui/hooks/useChain"
import { useAllChainsMap } from "@ui/hooks/useChains"
import { FC, useCallback, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Button, Dropdown } from "talisman-ui"
import * as yup from "yup"

import { useAddLedgerAccount } from "./context"
import { ConnectLedgerEthereum } from "./Shared/ConnectLedgerEthereum"
import { ConnectLedgerSubstrate } from "./Shared/ConnectLedgerSubstrate"

type FormData = {
  chainId: string
  type: AccountAddressType
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

const AssetHubConflictWarning: FC<{ chain: Chain | null | undefined }> = ({ chain }) => {
  const { t } = useTranslation("admin")
  const chains = useAllChainsMap()
  const accounts = useAccounts()

  const { relay, conflictChain } = useMemo(() => {
    if (chain) {
      if (["polkadot", "polkadot-asset-hub"].includes(chain.id))
        return {
          relay: "Polkadot",
          conflictChain:
            chain.id === "polkadot" ? chains["polkadot-asset-hub"] : chains["polkadot"],
        }

      if (["kusama", "kusama-asset-hub"].includes(chain.id))
        return {
          relay: "Kusama",
          conflictChain: chain.id === "kusama" ? chains["kusama-asset-hub"] : chains["kusama"],
        }
    }
    return { relay: null, conflictChain: null }
  }, [chain, chains])

  const warning = useMemo(() => {
    // show warning only if user has a network specific account for the conflicting chain
    return relay &&
      accounts.some((a) => conflictChain && a.genesisHash === conflictChain.genesisHash)
      ? t(
          "Adding the same Ledger account to both {{relay}} and {{relay}} Asset Hub results in them overriding each other.",
          { relay }
        )
      : null
  }, [accounts, conflictChain, relay, t])

  if (!warning) return null

  return <p className="text-body-secondary mt-6">{warning}</p>
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
          chainId: yup.string().when("type", {
            is: "sr25519",
            then: yup
              .string()
              .required("")
              .test(
                "is-ledger-chain",
                "Network not supported",
                (id) => !!ledgerChains.find((c) => c.id === id)
              ),
          }),
        })
        .required(),
    [ledgerChains]
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

  const chain = useChain(chainId ?? (defaultValues.chainId as string))

  const [isLedgerReady, setIsLedgerReady] = useState(false)

  const showStep2 = accountType === "ethereum" || (accountType === "sr25519" && chainId)

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
            <AssetHubConflictWarning chain={chain} />
          </>
        )}
        <div className={classNames("mt-12 h-[20rem]", showStep2 ? "visible" : "invisible")}>
          {chainId && accountType === "sr25519" && (
            <>
              <h2 className="mb-8 mt-0 text-base">{t("Step 2")}</h2>
              <ConnectLedgerSubstrate
                className="min-h-[11rem]"
                onReadyChanged={setIsLedgerReady}
                chainId={chainId}
              />
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
