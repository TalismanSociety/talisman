import { CustomEvmNetwork, EvmNetwork, EvmNetworkId } from "@core/domains/ethereum/types"
import { RequestUpsertCustomEvmNetwork } from "@core/domains/ethereum/types"
import { CustomNativeToken } from "@core/domains/tokens/types"
import { yupResolver } from "@hookform/resolvers/yup"
import { notify } from "@talisman/components/Notifications"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
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
import { useNavigate } from "react-router-dom"
import { useDebounce } from "react-use"
import { ModalDialog } from "talisman-ui"
import { Button, Checkbox, FormFieldContainer, FormFieldInputText, Modal } from "talisman-ui"

import { getNetworkFormSchema } from "./getNetworkFormSchema"
import { getRpcChainId } from "./helpers"
import { NetworkRpcsListField } from "./NetworkRpcsListField"

const ResetNetworkButton: FC<{ network: EvmNetwork | CustomEvmNetwork }> = ({ network }) => {
  const { t } = useTranslation("admin")
  const navigate = useNavigate()
  const { isOpen, open, close } = useOpenClose()

  const handleConfirmReset = useCallback(async () => {
    try {
      await api.ethNetworkReset(network.id.toString())
      navigate("/networks")
    } catch (err) {
      notify({
        title: t("Failed to reset"),
        subtitle: (err as Error).message,
        type: "error",
      })
    }
  }, [navigate, network.id, t])

  const networkName = network?.name ?? t("N/A")

  return (
    <>
      <Button type="button" className="mt-8" onClick={open}>
        {t("Reset to defaults")}
      </Button>
      <Modal isOpen={isOpen && !!network} onDismiss={close}>
        <ModalDialog title={t("Reset Network")} onClose={close}>
          <div className="text-body-secondary mt-4 space-y-16">
            <div className="text-base">
              <Trans t={t}>
                Network <span className="text-body">{networkName}</span> will be reset to Talisman's
                default settings.
              </Trans>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <Button onClick={close}>{t("Cancel")}</Button>
              <Button primary onClick={handleConfirmReset}>
                {t("Reset")}
              </Button>
            </div>
          </div>
        </ModalDialog>
      </Modal>
    </>
  )
}

const RemoveNetworkButton: FC<{ network: EvmNetwork | CustomEvmNetwork }> = ({ network }) => {
  const { t } = useTranslation("admin")
  const navigate = useNavigate()
  const { isOpen, open, close } = useOpenClose()

  const handleConfirmRemove = useCallback(async () => {
    if (!network) return
    try {
      await api.ethNetworkRemove(network.id.toString())
      navigate("/networks")
    } catch (err) {
      notify({
        title: t("Failed to remove"),
        subtitle: (err as Error).message,
        type: "error",
      })
    }
  }, [network, navigate, t])

  const networkName = network?.name ?? t("N/A")

  return (
    <>
      <Button type="button" className="mt-8" onClick={open}>
        {t("Remove Network")}
      </Button>
      <Modal isOpen={isOpen && !!network} onDismiss={close}>
        <ModalDialog title={t("Remove Network")} onClose={close}>
          <div className="text-body-secondary mt-4 space-y-16">
            <div className="text-base">
              <Trans t={t}>
                Network <span className="text-body">{networkName}</span> and associated tokens will
                be removed from Talisman.
              </Trans>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <Button onClick={close}>{t("Cancel")}</Button>
              <Button primary onClick={handleConfirmRemove}>
                {t("Remove")}
              </Button>
            </div>
          </div>
        </ModalDialog>
      </Modal>
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

type NetworkFormProps = {
  evmNetworkId?: EvmNetworkId
  onSubmitted?: () => void
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

export const NetworkForm: FC<NetworkFormProps> = ({ evmNetworkId, onSubmitted }) => {
  const { t } = useTranslation("admin")
  const schema = useMemo(() => getNetworkFormSchema(evmNetworkId), [evmNetworkId])

  const qIsBuiltInEvmNetwork = useIsBuiltInEvmNetwork(evmNetworkId)

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

  const formData = watch()
  const { isTestnet, rpcs, id, tokenCoingeckoId } = formData

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
  const qRpcChainId = useRpcChainId(rpcs?.[0]?.url)
  useEffect(() => {
    if (evmNetworkId || !qRpcChainId.isFetched) return
    if (!!qRpcChainId.data && qRpcChainId.data !== id) {
      setValue("id", qRpcChainId.data)
    } else if (!!id && !qRpcChainId.data) {
      resetField("id")
    }
  }, [evmNetworkId, id, qRpcChainId.data, qRpcChainId.isFetched, resetField, setValue])

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
      isCustom && qIsBuiltInEvmNetwork.isFetched
        ? [!qIsBuiltInEvmNetwork.data, !!qIsBuiltInEvmNetwork.data]
        : [false, false],
    [isCustom, qIsBuiltInEvmNetwork.data, qIsBuiltInEvmNetwork.isFetched]
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
            {evmNetwork && showRemove && <RemoveNetworkButton network={evmNetwork} />}
            {evmNetwork && showReset && <ResetNetworkButton network={evmNetwork} />}
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
  )
}
