import { CustomErc20TokenCreate } from "@core/domains/tokens/types"
import { yupResolver } from "@hookform/resolvers/yup"
import { assert } from "@polkadot/util"
import HeaderBlock from "@talisman/components/HeaderBlock"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { LoaderIcon, PlusIcon } from "@talisman/theme/icons"
//import { PlusIcon } from "@talisman/theme/icons"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { api } from "@ui/api"
import { AnalyticsPage } from "@ui/api/analytics"
import Layout from "@ui/apps/dashboard/layout"
import { AssetLogoBase } from "@ui/domains/Asset/AssetLogo"
//import { GENERIC_TOKEN_LOGO_URL, TokenImage } from "@ui/domains/Asset/TokenLogo"
import { NetworkSelect } from "@ui/domains/Ethereum/NetworkSelect"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useErc20TokenInfo } from "@ui/hooks/useErc20TokenInfo"
import { useSortedEvmNetworks } from "@ui/hooks/useSortedEvmNetworks"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { Button, FormFieldContainer, FormFieldInputText, classNames } from "talisman-ui"
import * as yup from "yup"

type FormData = Pick<
  CustomErc20TokenCreate,
  "evmNetworkId" | "contractAddress" | "symbol" | "decimals"
>

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Settings",
  featureVersion: 1,
  page: "Settings - Add Token",
}

export const CustomTokenAdd = () => {
  useAnalyticsPageView(ANALYTICS_PAGE)
  const navigate = useNavigate()
  const networks = useSortedEvmNetworks()
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
              "Invalid network"
            ),
          contractAddress: yup
            .string()
            .required()
            .matches(/^0x[0-9a-fA-F]{40}$/, "Invalid address"),
        })
        .required(),
    [networks]
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
  const {
    isLoading,
    error: tokenInfoError,
    token: tokenInfo,
  } = useErc20TokenInfo(evmNetworkId, contractAddress)

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
        // save the object composed with CoinGecko and chain data
        await api.addCustomErc20Token(tokenInfo)
        navigate("/tokens")
      } catch (err) {
        setError(`Failed to add the token : ${(err as Error)?.message ?? ""}`)
      }
    },
    [navigate, tokenInfo]
  )

  return (
    <Layout analytics={ANALYTICS_PAGE} withBack centered>
      <HeaderBlock
        title="Add custom token"
        text="Tokens can be created by anyone and named however they like, even to imitate existing tokens. Always ensure you have verified the token address before adding a custom token."
      />
      <form className="my-20 space-y-4" onSubmit={handleSubmit(submit)}>
        <FormFieldContainer label="Network" error={errors.evmNetworkId?.message}>
          <NetworkSelect
            placeholder="Select a network"
            onChange={handleNetworkChange}
            className="w-full"
          />
        </FormFieldContainer>
        <FormFieldContainer
          label="Contract Address"
          error={errors.contractAddress?.message ?? (tokenInfoError && "Invalid address")}
        >
          <FormFieldInputText
            {...register("contractAddress")}
            spellCheck={false}
            data-lpignore
            type="text"
            autoComplete="off"
            placeholder="Paste token address"
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
          <FormFieldContainer label="Symbol" error={errors.symbol?.message}>
            <FormFieldInputText
              {...register("symbol")}
              type="text"
              placeholder="ABC"
              autoComplete="off"
              disabled
              before={
                tokenInfo && (
                  <AssetLogoBase className="mr-2 ml-[-0.8rem] text-[3rem]" url={tokenInfo?.image} />
                )
              }
              small
            />
          </FormFieldContainer>
          <FormFieldContainer label="Decimals" error={errors.decimals?.message}>
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
            disabled={!isValid || isLoading}
            processing={isSubmitting}
          >
            Add Token
          </Button>
        </div>
      </form>
    </Layout>
  )
}
