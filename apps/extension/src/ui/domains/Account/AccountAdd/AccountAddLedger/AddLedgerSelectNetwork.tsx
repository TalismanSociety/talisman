import { AccountAddressType, Chain } from "@extension/core"
import { yupResolver } from "@hookform/resolvers/yup"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { classNames } from "@talismn/util"
import { AccountTypeSelector } from "@ui/domains/Account/AccountTypeSelector"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { useLedgerChains } from "@ui/hooks/ledger/useLedgerChains"
import useChain from "@ui/hooks/useChain"
import { useCallback, useMemo, useState } from "react"
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
            {["polkadot", "polkadot-asset-hub"].includes(chain?.id ?? "") && (
              <p className="text-body-secondary mt-6">
                {t(
                  "Additionally, a given Ledger account cannot be added in Talisman for both Polakdot and Polkadot Asset Hub as they would share the same address. Adding one would remove the other, and vice versa."
                )}
              </p>
            )}
            {["kusama", "kusama-asset-hub"].includes(chain?.id ?? "") && (
              <p className="text-body-secondary mt-6">
                {t(
                  "Additionally, a given Ledger account cannot be added in Talisman for both Kusama and Kusama Asset Hub as they would share the same address. Adding one would remove the other, and vice versa."
                )}
              </p>
            )}
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
