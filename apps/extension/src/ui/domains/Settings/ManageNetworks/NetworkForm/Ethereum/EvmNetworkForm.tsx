import { RequestUpsertCustomEvmNetwork } from "@extension/core"
import { yupResolver } from "@hookform/resolvers/yup"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { CustomSubNativeToken } from "@talismn/balances"
import {
  CustomEvmNetwork,
  EvmNetwork,
  EvmNetworkId,
  isCustomEvmNetwork,
} from "@talismn/chaindata-provider"
import { ArrowRightIcon, InfoIcon, RotateCcwIcon } from "@talismn/icons"
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
import { useKnownEvmNetwork } from "@ui/hooks/useKnownEvmNetwork"
import { useSetting } from "@ui/hooks/useSettings"
import useToken from "@ui/hooks/useToken"
import { ChangeEventHandler, FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { FormProvider, useForm } from "react-hook-form"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useDebounce } from "react-use"
import {
  Button,
  Checkbox,
  FormFieldContainer,
  FormFieldInputText,
  Modal,
  ModalDialog,
  Toggle,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useOpenClose,
} from "talisman-ui"

import { NetworkRpcsListField } from "../NetworkRpcsListField"
import { getEvmRpcChainId } from "./helpers"
import { RemoveEvmNetworkButton } from "./RemoveEvmNetworkButton"
import { ResetEvmNetworkButton } from "./ResetEvmNetworkButton"
import { evmNetworkFormSchema } from "./schema"

type EvmNetworkFormProps = {
  evmNetworkId?: EvmNetworkId
  onSubmitted?: () => void
}

const EnableNetworkToggle: FC<{ evmNetworkId?: string }> = ({ evmNetworkId }) => {
  const { t } = useTranslation("admin")
  const { evmNetwork, isActive, setActive, isActiveSetByUser, resetToTalismanDefault } =
    useKnownEvmNetwork(evmNetworkId)

  if (!evmNetwork) return null

  return (
    <div className="pt-8">
      <FormFieldContainer
        label={
          <span className="inline-flex items-center gap-3">
            <span>{t("Active")}</span>
            <Tooltip placement="bottom-start">
              <TooltipTrigger>
                <InfoIcon />
              </TooltipTrigger>
              <TooltipContent>
                <div>{t("Set as active to fetch token balances for this network")}</div>
              </TooltipContent>
            </Tooltip>
          </span>
        }
      >
        <div className="flex gap-3">
          <Toggle checked={isActive} onChange={(e) => setActive(e.target.checked)}>
            <span className={"text-grey-300"}>{isActive ? t("Yes") : t("No")}</span>
          </Toggle>
          {isActiveSetByUser && (
            <Tooltip>
              <TooltipTrigger
                className="text-primary text-xs"
                type="button"
                onClick={resetToTalismanDefault}
              >
                <RotateCcwIcon />
              </TooltipTrigger>
              <TooltipContent>
                <div>{t("Reset to default")}</div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </FormFieldContainer>
    </div>
  )
}

export const EvmNetworkForm: FC<EvmNetworkFormProps> = ({ evmNetworkId, onSubmitted }) => {
  const { t } = useTranslation("admin")
  const isBuiltInEvmNetwork = useIsBuiltInEvmNetwork(evmNetworkId)

  const { evmNetworks } = useEvmNetworks({ activeOnly: false, includeTestnets: true })
  const [useTestnets, setUseTestnets] = useSetting("useTestnets")

  const { defaultValues, isCustom, isEditMode, evmNetwork } = useEditMode(evmNetworkId)
  const tEditMode = evmNetworkId ? t("Edit") : t("Add")

  const formProps = useForm<RequestUpsertCustomEvmNetwork>({
    mode: "all",
    defaultValues,
    context: { evmNetworkId },
    resolver: yupResolver(evmNetworkFormSchema),
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
    formState: { errors, isValid, isSubmitting, isDirty, touchedFields },
  } = formProps

  const { isTestnet, rpcs, id, tokenCoingeckoId } = watch()

  // initialize form with existing values (edit mode), only once
  const initialized = useRef(false)
  useEffect(() => {
    if (evmNetworkId && defaultValues && !initialized.current) {
      reset(defaultValues)
      initialized.current = true
    }
  }, [defaultValues, evmNetworkId, reset])

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
      if (!errors.id) setError("id", { message: t("Network already exists") })
    } else {
      if (errors.id) clearErrors("id")
      autoFill()
    }
  }, [autoFill, clearErrors, evmNetworkId, evmNetworks, id, setError, errors.id, t])

  const handleIsTestnetChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => setValue("isTestnet", e.target.checked, { shouldTouch: true }),
    [setValue]
  )

  const [showRemove, showReset] = useMemo(
    () =>
      isCustom && isBuiltInEvmNetwork.isFetched
        ? [!isBuiltInEvmNetwork.data, !!isBuiltInEvmNetwork.data]
        : [false, false],
    [isCustom, isBuiltInEvmNetwork.data, isBuiltInEvmNetwork.isFetched]
  )

  const [submitError, setSubmitError] = useState<string>()
  const submit = useCallback(
    async (network: RequestUpsertCustomEvmNetwork) => {
      try {
        await api.ethNetworkUpsert({ ...network, tokenLogoUrl, chainLogoUrl })
        if (network.isTestnet && !useTestnets) setUseTestnets(true)
        onSubmitted?.()
      } catch (err) {
        setSubmitError((err as Error).message)
      }
    },
    [chainLogoUrl, tokenLogoUrl, onSubmitted, setUseTestnets, useTestnets]
  )

  // on edit screen, wait for existing network to be loaded
  if (evmNetworkId && !defaultValues) return null

  return (
    <>
      <HeaderBlock
        title={
          isCustom
            ? t("{{tEditMode}} Custom EVM Network", { tEditMode })
            : t("{{tEditMode}} EVM Network", { tEditMode })
        }
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
              <span className="text-body-secondary">{t("This is a testnet")}</span>
            </Checkbox>
          </div>
          <EnableNetworkToggle evmNetworkId={evmNetworkId} />
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
      <ExistingNetworkModal evmNetworkId={evmNetworkId !== id ? id : undefined} />
    </>
  )
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
    queryFn: () => (debouncedRpcUrl ? getEvmRpcChainId(debouncedRpcUrl) : null),
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
  const nativeToken = useToken(evmNetwork?.nativeToken?.id) as CustomSubNativeToken | undefined
  const defaultValues = useMemo(() => {
    if (!evmNetworkId) return DEFAULT_VALUES
    return evmNetwork && nativeToken ? evmNetworkToFormData(evmNetwork, nativeToken) : undefined
  }, [evmNetwork, evmNetworkId, nativeToken])

  const isCustom = useMemo(() => !!evmNetwork && isCustomEvmNetwork(evmNetwork), [evmNetwork])

  return { defaultValues, isEditMode: !!evmNetworkId, isCustom, evmNetwork, nativeToken }
}

const evmNetworkToFormData = (
  network?: EvmNetwork | CustomEvmNetwork,
  nativeToken?: CustomSubNativeToken
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

const ExistingNetworkModal: FC<{ evmNetworkId?: EvmNetworkId }> = ({ evmNetworkId }) => {
  const { t } = useTranslation("admin")
  const { evmNetwork, isActive } = useKnownEvmNetwork(evmNetworkId)
  const { isOpen, open, close } = useOpenClose()
  const navigate = useNavigate()

  // keep latest data so it doesn't disappear while popup is closing
  const [networkInfo, setNetworkInfo] = useState({ id: "", name: "" })

  useEffect(() => {
    if (evmNetwork) {
      const { id, name } = evmNetwork
      setNetworkInfo({ id, name: name ?? "Unnamed network" })
      open()
    }
  }, [evmNetwork, open])

  const handleGoToClick = useCallback(() => {
    close()
    navigate(`/settings/networks-tokens/networks/ethereum/${evmNetworkId}`, { replace: true })
  }, [close, evmNetworkId, navigate])

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <ModalDialog title={t("Known network")} onClose={close}>
        <p className="text-body-secondary">
          {isActive ? (
            <Trans
              t={t}
              defaults="Network <Highlight>{{name}} ({{id}})</Highlight> already exists. Would you like to review its settings?"
              components={{ Highlight: <span className="text-body" /> }}
              values={networkInfo}
            />
          ) : (
            <Trans
              t={t}
              defaults="Network <Highlight>{{name}} ({{id}})</Highlight> already exists but has not been activated. Would you like to review its settings?"
              components={{ Highlight: <span className="text-body" /> }}
              values={networkInfo}
            />
          )}
        </p>
        <div className="mt-12 grid grid-cols-2 gap-8">
          <Button onClick={close}>{t("Close")}</Button>
          <Button primary onClick={handleGoToClick}>
            {t("Take me there")}
          </Button>
        </div>
      </ModalDialog>
    </Modal>
  )
}
