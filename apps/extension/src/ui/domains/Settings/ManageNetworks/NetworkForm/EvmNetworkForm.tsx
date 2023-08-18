import { CustomEvmNetwork, EvmNetwork, EvmNetworkId } from "@core/domains/ethereum/types"
import { RequestUpsertCustomEvmNetwork } from "@core/domains/ethereum/types"
import { CustomNativeToken } from "@core/domains/tokens/types"
import { yupResolver } from "@hookform/resolvers/yup"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { ArrowRightIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { AssetLogoBase } from "@ui/domains/Asset/AssetLogo"
import { ChainLogoBase } from "@ui/domains/Asset/ChainLogo"
import { useCoinGeckoTokenImageUrl } from "@ui/hooks/useCoinGeckoTokenImageUrl"
import { useEvmChainIcon } from "@ui/hooks/useEvmChainIcon"
import { useEvmChainInfo } from "@ui/hooks/useEvmChainInfo"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import { useIsBuiltInEvmNetwork } from "@ui/hooks/useIsBuiltInEvmNetwork"
import { useSetting } from "@ui/hooks/useSettings"
import useToken from "@ui/hooks/useToken"
import { isCustomEvmNetwork } from "@ui/util/isCustomEvmNetwork"
import { ChangeEventHandler, FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { FormProvider, useForm } from "react-hook-form"
import { Trans, useTranslation } from "react-i18next"
import { useDebounce } from "react-use"
import { Button, Checkbox, FormFieldContainer, FormFieldInputText } from "talisman-ui"

import { getEvmNetworkFormSchema } from "./getEvmNetworkFormSchema"
import { getRpcChainId } from "./helpers"
import { NetworkRpcsListField } from "./NetworkRpcsListField"
import { RemoveEvmNetworkButton } from "./RemoveEvmNetworkButton"
import { ResetEvmNetworkButton } from "./ResetEvmNetworkButton"

type EvmNetworkFormProps = {
  evmNetworkId?: EvmNetworkId
  onSubmitted?: () => void
}

export const EvmNetworkForm: FC<EvmNetworkFormProps> = ({ evmNetworkId, onSubmitted }) => {
  const { t } = useTranslation("admin")
  const schema = useMemo(() => getEvmNetworkFormSchema(evmNetworkId), [evmNetworkId])

  const isBuiltInEvmNetwork = useIsBuiltInEvmNetwork(evmNetworkId)

  const [submitError, setSubmitError] = useState<string>()
  const { evmNetworks } = useEvmNetworks(true)
  const [useTestnets, setUseTestNets] = useSetting("useTestnets")

  const { defaultValues, isCustom, isEditMode, evmNetwork } = useEditMode(evmNetworkId)

  // because of the RPC checks, do not validate on each change
  const formProps = useForm<RequestUpsertCustomEvmNetwork>({
    mode: "onBlur",
    defaultValues,
    resolver: yupResolver(schema),
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    resetField,
    clearErrors,
    setError,
    reset,
    trigger,
    formState: { errors, isValid, isSubmitting, isDirty, touchedFields },
  } = formProps

  const { isTestnet, rpcs, id, tokenCoingeckoId } = watch()

  // initialize form with existing values (edit mode), only once
  const initialized = useRef(false)
  useEffect(() => {
    if (evmNetworkId && defaultValues && !initialized.current) {
      reset(defaultValues)
      trigger("rpcs")
      initialized.current = true
    }
  }, [defaultValues, evmNetworkId, reset, trigger])

  // auto detect chain id based on RPC url (add mode only)
  const rpcChainId = useRpcChainId(rpcs?.[0]?.url)
  useEffect(() => {
    if (evmNetworkId || !rpcChainId.isFetched) return
    if (!!rpcChainId.data && rpcChainId.data !== id) {
      setValue("id", rpcChainId.data)
    } else if (!!id && !rpcChainId.data) {
      resetField("id")
    }
  }, [evmNetworkId, id, rpcChainId.data, rpcChainId.isFetched, resetField, setValue])

  // fetch token logo's url, but only if form has been edited to reduce 429 errors from coingecko
  const coingeckoLogoUrl = useCoinGeckoTokenImageUrl(isDirty ? tokenCoingeckoId : null)

  const tokenLogoUrl = useMemo(
    // existing icon has priority
    () =>
      touchedFields?.tokenCoingeckoId
        ? coingeckoLogoUrl
        : defaultValues?.tokenLogoUrl ?? coingeckoLogoUrl,
    [coingeckoLogoUrl, defaultValues?.tokenLogoUrl, touchedFields?.tokenCoingeckoId]
  )

  const { chainInfo } = useEvmChainInfo(id)
  const { url: chainIconUrl } = useEvmChainIcon(chainInfo?.icon)
  const chainLogoUrl = useMemo(
    // existing icon has priority
    () => defaultValues?.chainLogoUrl ?? chainIconUrl ?? null,
    [chainIconUrl, defaultValues?.chainLogoUrl]
  )

  const autoFill = useCallback(async () => {
    if (!chainInfo) return

    setValue("name", chainInfo.name)
    setValue("blockExplorerUrl", chainInfo.explorers?.[0]?.url ?? "")
    setValue("tokenDecimals", chainInfo.nativeCurrency.decimals)
    setValue("isTestnet", chainInfo.name.toLocaleLowerCase().includes("testnet"))
    setValue("tokenSymbol", chainInfo.nativeCurrency.symbol, {
      shouldValidate: true,
      shouldTouch: true,
    })
  }, [chainInfo, setValue])

  // attempt an autofill once chain id is detected
  useEffect(() => {
    // check only if adding a new network
    if (evmNetworkId || !id) return

    if (evmNetworks?.some((n) => n.id === id)) {
      if (!errors.id) setError("id", { message: t("already exists") })
    } else {
      if (errors.id) clearErrors("id")
      autoFill()
    }
  }, [autoFill, clearErrors, evmNetworkId, evmNetworks, id, setError, errors.id, t])

  const [showRemove, showReset] = useMemo(
    () =>
      isCustom && isBuiltInEvmNetwork.isFetched
        ? [!isBuiltInEvmNetwork.data, !!isBuiltInEvmNetwork.data]
        : [false, false],
    [isCustom, isBuiltInEvmNetwork.data, isBuiltInEvmNetwork.isFetched]
  )

  const submit = useCallback(
    async (network: RequestUpsertCustomEvmNetwork) => {
      try {
        await api.ethNetworkUpsert({ ...network, tokenLogoUrl, chainLogoUrl })
        if (network.isTestnet && !useTestnets) setUseTestNets(true)
        onSubmitted?.()
      } catch (err) {
        setSubmitError((err as Error).message)
      }
    },
    [chainLogoUrl, tokenLogoUrl, onSubmitted, setUseTestNets, useTestnets]
  )

  const handleIsTestnetChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => setValue("isTestnet", e.target.checked, { shouldTouch: true }),
    [setValue]
  )

  // on edit screen, wait for existing network to be loaded
  if (evmNetworkId && !defaultValues) return null

  return (
    <>
      <HeaderBlock
        title={t("{{editMode}} EVM Network", { editMode: evmNetworkId ? t("Edit") : t("Add") })}
        text={
          <Trans
            t={t}
            defaults="Only ever add RPCs you trust.<br />RPCs will automatically cycle in the order of priority defined here in case of any errors."
          />
        }
      />
      <form className="mt-24 space-y-4" onSubmit={handleSubmit(submit)}>
        <FormProvider {...formProps}>
          <NetworkRpcsListField />
          <div className="grid grid-cols-3 gap-12">
            <FormFieldContainer label={t("Chain ID")} error={errors.id?.message}>
              <FormFieldInputText
                readOnly
                className="text-body-disabled cursor-not-allowed"
                before={
                  <ChainLogoBase
                    logo={chainLogoUrl}
                    className={classNames(
                      "ml-[-0.8rem] mr-[0.4rem] min-w-[3rem] text-[3rem]",
                      !id && "opacity-50"
                    )}
                  />
                }
                {...register("id")}
              />
            </FormFieldContainer>
            <FormFieldContainer
              className="col-span-2"
              label={t("Network Name")}
              error={errors.name?.message}
            >
              <FormFieldInputText placeholder={t("Paraverse")} {...register("name")} />
            </FormFieldContainer>
          </div>
          <div className="grid grid-cols-3 gap-12">
            <FormFieldContainer
              label={t("Token Coingecko ID")}
              error={errors.tokenCoingeckoId?.message}
            >
              <FormFieldInputText
                before={
                  <AssetLogoBase
                    url={tokenLogoUrl}
                    className="ml-[-0.8rem] mr-[0.4rem] min-w-[3rem] text-[3rem]"
                  />
                }
                placeholder={t("(optional)")}
                {...register("tokenCoingeckoId")}
              />
            </FormFieldContainer>
            <FormFieldContainer label={t("Token symbol")} error={errors.tokenSymbol?.message}>
              <FormFieldInputText placeholder={"ABC"} {...register("tokenSymbol")} />
            </FormFieldContainer>
            <FormFieldContainer label={t("Token decimals")} error={errors.tokenDecimals?.message}>
              <FormFieldInputText
                placeholder="18"
                {...register("tokenDecimals", { valueAsNumber: true })}
              />
            </FormFieldContainer>
          </div>
          <div className="text-body-disabled mt-[-1.6rem] pb-8 text-xs">
            <Trans
              t={t}
              defaults="Talisman uses CoinGecko as reference for fiat rates and token logos.<br />Find the API ID of the native token of this network on <Link>https://coingecko.com</Link> and paste it here."
              components={{
                Link: (
                  // eslint-disable-next-line jsx-a11y/anchor-has-content
                  <a
                    className="text-body-secondary hover:text-body"
                    href="https://coingecko.com"
                    target="_blank"
                  ></a>
                ),
              }}
            />
          </div>
          <FormFieldContainer
            label={t("Block explorer URL")}
            error={errors.blockExplorerUrl?.message}
          >
            <FormFieldInputText placeholder="https://" {...register("blockExplorerUrl")} />
          </FormFieldContainer>
          <div>
            <Checkbox checked={!!isTestnet} onChange={handleIsTestnetChange}>
              <span className="text-body-secondary">{t("Testnet")}</span>
            </Checkbox>
          </div>
          <div className="text-alert-warn">{submitError}</div>
          <div className="flex justify-between">
            <div>
              {evmNetwork && showRemove && <RemoveEvmNetworkButton network={evmNetwork} />}
              {evmNetwork && showReset && <ResetEvmNetworkButton network={evmNetwork} />}
            </div>
            <Button
              type="submit"
              className="mt-8"
              primary
              disabled={!isValid || !isDirty}
              processing={isSubmitting}
            >
              {isEditMode ? t("Update Network") : t("Add Network")}
              <ArrowRightIcon className="ml-4 inline text-lg" />
            </Button>
          </div>
        </FormProvider>
      </form>
    </>
  )
}

const evmNetworkToFormData = (
  network?: EvmNetwork | CustomEvmNetwork,
  nativeToken?: CustomNativeToken
): RequestUpsertCustomEvmNetwork | undefined => {
  if (!network || !nativeToken) return undefined

  return {
    id: network.id,
    name: network.name ?? "",
    rpcs: network.rpcs ?? [],
    blockExplorerUrl:
      network.explorerUrl ?? ("explorerUrls" in network ? network.explorerUrls?.[0] : undefined),
    isTestnet: !!network.isTestnet,
    chainLogoUrl: network.logo ?? null,
    tokenCoingeckoId: nativeToken.coingeckoId ?? null,
    tokenSymbol: nativeToken.symbol,
    tokenDecimals: nativeToken.decimals,
    tokenLogoUrl: nativeToken.logo ?? null,
  }
}

const useRpcChainId = (rpcUrl: string) => {
  const [debouncedRpcUrl, setDebouncedRpcUrl] = useState(rpcUrl)
  useDebounce(
    () => {
      setDebouncedRpcUrl(rpcUrl)
    },
    250,
    [rpcUrl]
  )

  return useQuery({
    queryKey: ["useRpcChainId", debouncedRpcUrl],
    queryFn: () => (debouncedRpcUrl ? getRpcChainId(debouncedRpcUrl) : null),
    refetchInterval: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  })
}

const DEFAULT_VALUES: Partial<RequestUpsertCustomEvmNetwork> = {
  rpcs: [{ url: "" }], // provides one empty row
}

const useEditMode = (evmNetworkId?: EvmNetworkId) => {
  const evmNetwork = useEvmNetwork(evmNetworkId)
  const nativeToken = useToken(evmNetwork?.nativeToken?.id) as CustomNativeToken | undefined
  const defaultValues = useMemo(() => {
    if (!evmNetworkId) return DEFAULT_VALUES
    return evmNetwork && nativeToken ? evmNetworkToFormData(evmNetwork, nativeToken) : undefined
  }, [evmNetwork, evmNetworkId, nativeToken])

  const isCustom = useMemo(() => !!evmNetwork && isCustomEvmNetwork(evmNetwork), [evmNetwork])

  return { defaultValues, isEditMode: !!evmNetworkId, isCustom, evmNetwork, nativeToken }
}
