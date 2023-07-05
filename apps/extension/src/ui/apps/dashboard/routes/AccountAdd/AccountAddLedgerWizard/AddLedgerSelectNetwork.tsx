import { AccountAddressType } from "@core/domains/accounts/types"
import { Chain } from "@core/domains/chains/types"
import { yupResolver } from "@hookform/resolvers/yup"
import { Dropdown, RenderItemFunc } from "@talisman/components/Dropdown"
import StytledHeaderBlock from "@talisman/components/HeaderBlock"
import Spacer from "@talisman/components/Spacer"
import { classNames } from "@talismn/util"
import { DashboardLayout } from "@ui/apps/dashboard/layout/DashboardLayout"
import { AccountTypeSelector } from "@ui/domains/Account/AccountTypeSelector"
import Asset from "@ui/domains/Asset"
import { useLedgerChains } from "@ui/hooks/ledger/useLedgerChains"
import useChain from "@ui/hooks/useChain"
import { useCallback, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Button } from "talisman-ui"
import * as yup from "yup"

import { useAddLedgerAccount } from "./context"
import { ConnectLedgerEthereum } from "./Shared/ConnectLedgerEthereum"
import { ConnectLedgerSubstrate } from "./Shared/ConnectLedgerSubstrate"

type FormData = {
  chainId: string
  type: AccountAddressType
}

const renderOption: RenderItemFunc<Chain> = (chain) => {
  return (
    <div className="flex items-center gap-4 text-base">
      <Asset.ChainLogo id={chain.id} />
      <span className="flex-grow overflow-hidden text-ellipsis whitespace-nowrap">
        {chain.name}
      </span>
    </div>
  )
}

export const AddLedgerSelectNetwork = () => {
  const { t } = useTranslation("admin")
  const { data: defaultValues, updateData } = useAddLedgerAccount()

  const navigate = useNavigate()
  const ledgerChains = useLedgerChains()
  const defaultChain = useChain(defaultValues.chainId as string)

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

  const [isLedgerReady, setIsLedgerReady] = useState(false)

  const showStep2 = accountType === "ethereum" || (accountType === "sr25519" && chainId)

  return (
    <DashboardLayout withBack centered>
      <form className="flex h-[53.4rem] max-h-screen flex-col" onSubmit={handleSubmit(submit)}>
        <div className="flex-grow">
          <StytledHeaderBlock
            title={t("Import from Ledger")}
            text={t("What type of account would you like to import ?")}
          />
          <Spacer small />
          <AccountTypeSelector defaultType={accountType} onChange={handleTypeChange} />
          {accountType === "sr25519" && (
            <>
              <h2 className="mb-8 mt-12 text-base">{t("Step 1")}</h2>
              <Dropdown
                key={defaultChain?.id ?? "DEFAULT"}
                propertyKey="id"
                items={ledgerChains}
                defaultSelectedItem={defaultChain}
                placeholder={t("Select a network")}
                renderItem={renderOption}
                onChange={handleNetworkChange}
              />
              <p className="text-body-secondary mt-6">
                {t("Please note: a Ledger account can only be used on a single network.")}
              </p>
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
    </DashboardLayout>
  )
}
