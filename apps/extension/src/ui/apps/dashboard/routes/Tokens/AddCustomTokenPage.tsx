import { CustomEvmErc20TokenCreate } from "@extension/core"
import { yupResolver } from "@hookform/resolvers/yup"
import { assert } from "@polkadot/util"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { LoaderIcon, PlusIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { api } from "@ui/api"
import { AnalyticsPage } from "@ui/api/analytics"
import { DashboardLayout } from "@ui/apps/dashboard/layout/DashboardLayout"
import { AssetLogoBase } from "@ui/domains/Asset/AssetLogo"
import { NetworkSelect } from "@ui/domains/Ethereum/NetworkSelect"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useEvmTokenInfo } from "@ui/hooks/useEvmTokenInfo"
import { useKnownEvmToken } from "@ui/hooks/useKnownEvmToken"
import { useSortedEvmNetworks } from "@ui/hooks/useSortedEvmNetworks"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Button, FormFieldContainer, FormFieldInputText } from "talisman-ui"
import * as yup from "yup"

type FormData = Pick<
  CustomEvmErc20TokenCreate,
  "evmNetworkId" | "contractAddress" | "symbol" | "decimals"
>

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Settings",
  featureVersion: 1,
  page: "Settings - Add Token",
}

export const AddCustomTokenPage = () => {
  const { t } = useTranslation("admin")
  useAnalyticsPageView(ANALYTICS_PAGE)
  const navigate = useNavigate()
  const networks = useSortedEvmNetworks(true)

  const [error, setError] = useState<string>()

  // our only user inputs are chain and contract
  const schema = useMemo(
    () =>
      yup
        .object({
          evmNetworkId: yup
            .string()
            .required()
            .oneOf(
              networks.map(({ id }) => id),
              t("Invalid network")
            ),
          contractAddress: yup
            .string()
            .required()
            .matches(/^0x[0-9a-fA-F]{40}$/, t("Invalid address")),
        })
        .required(),
    [networks, t]
  )

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    resetField,
    formState: { errors, isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "onChange",
    resolver: yupResolver(schema),
  })

  const { contractAddress, evmNetworkId, symbol, decimals } = watch()

  const { token: knownToken, isActive, setActive } = useKnownEvmToken(evmNetworkId, contractAddress)

  const {
    isLoading,
    error: tokenInfoError,
    token: tokenInfo,
  } = useEvmTokenInfo(evmNetworkId, contractAddress as `0x${string}`)

  const handleNetworkChange = useCallback(
    (id: EvmNetworkId) => {
      setValue("evmNetworkId", id, { shouldValidate: true })
    },
    [setValue]
  )

  // Keeping symbol and decimal fields bound to the form in case we want to make them editable later
  useEffect(() => {
    if (!tokenInfo) {
      resetField("decimals")
      resetField("symbol")
    } else {
      // force values fetched from blockchain
      setValue("symbol", tokenInfo?.symbol, { shouldValidate: true })
      setValue("decimals", tokenInfo?.decimals, { shouldValidate: true })
    }
  }, [decimals, resetField, setValue, symbol, tokenInfo])

  const submit = useCallback(
    async (token: FormData) => {
      try {
        assert(tokenInfo, "Missing token info")
        assert(tokenInfo.contractAddress === token.contractAddress, "Token mismatch")
        assert(tokenInfo.evmNetworkId === token.evmNetworkId, "Token mismatch")

        if (knownToken && !isActive) await setActive(true)
        else {
          // save the object composed with CoinGecko and chain data
          await api.addCustomEvmToken(tokenInfo)
        }
        navigate("/tokens")
      } catch (err) {
        setError(`Failed to add the token : ${(err as Error)?.message ?? ""}`)
      }
    },
    [isActive, knownToken, navigate, setActive, tokenInfo]
  )

  const addressErrorMessage = useMemo(() => {
    // error code may be filled by viem provider
    const error = tokenInfoError as Error & { code?: string }

    if (error?.code === "NETWORK_ERROR") return t("Failed to connect")
    else if (error) return t("Not a valid token address")
    else return undefined
  }, [t, tokenInfoError])

  return (
    <DashboardLayout analytics={ANALYTICS_PAGE} withBack centered>
      <HeaderBlock
        title={t("Add custom token")}
        text={t(
          "Tokens can be created by anyone and named however they like, even to imitate existing tokens. Always ensure you have verified the token address before adding a custom token."
        )}
      />
      <form className="my-20 space-y-4" onSubmit={handleSubmit(submit)}>
        <FormFieldContainer label={t("Network")} error={errors.evmNetworkId?.message}>
          <NetworkSelect
            withTestnets
            placeholder={t("Select a network")}
            onChange={handleNetworkChange}
            className="w-full"
          />
        </FormFieldContainer>
        <FormFieldContainer
          label={t("Contract Address")}
          error={errors.contractAddress?.message ?? addressErrorMessage}
        >
          <FormFieldInputText
            {...register("contractAddress")}
            spellCheck={false}
            data-lpignore
            type="text"
            autoComplete="off"
            placeholder={t("Paste token address")}
            after={
              <LoaderIcon
                className={classNames(
                  "animate-spin-slow text-lg opacity-50",
                  isLoading ? "visible" : "invisible"
                )}
              />
            }
            small
          />
        </FormFieldContainer>
        <div className="grid grid-cols-2 gap-12">
          <FormFieldContainer label={t("Symbol")} error={errors.symbol?.message}>
            <FormFieldInputText
              {...register("symbol")}
              type="text"
              placeholder="ABC"
              autoComplete="off"
              disabled
              before={
                tokenInfo && (
                  <AssetLogoBase className="ml-[-0.8rem] mr-2 text-[3rem]" url={tokenInfo?.image} />
                )
              }
              small
            />
          </FormFieldContainer>
          <FormFieldContainer label={t("Decimals")} error={errors.decimals?.message}>
            <FormFieldInputText
              {...register("decimals", {
                valueAsNumber: true,
              })}
              type="number"
              placeholder="0"
              autoComplete="off"
              disabled
              small
            />
          </FormFieldContainer>
        </div>
        <div className="text-alert-error">{error}</div>
        <div className="flex justify-end py-8">
          <Button
            className="h-24 w-[24rem] text-base"
            icon={PlusIcon}
            type="submit"
            primary
            disabled={isActive || !isValid || isLoading || !!tokenInfoError}
            processing={isSubmitting}
          >
            {knownToken ? t("Enable Token") : t("Add Token")}
          </Button>
        </div>
      </form>
    </DashboardLayout>
  )
}
