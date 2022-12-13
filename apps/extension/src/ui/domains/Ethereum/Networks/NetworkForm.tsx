import { CustomEvmNetwork, EvmNetwork } from "@core/domains/ethereum/types"
import { RequestUpsertCustomEvmNetwork } from "@core/domains/ethereum/types/base"
import { CustomNativeToken } from "@core/domains/tokens/types"
import { yupResolver } from "@hookform/resolvers/yup"
import { ArrowRightIcon } from "@talisman/theme/icons"
import { api } from "@ui/api"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import useToken from "@ui/hooks/useToken"
import { ChangeEventHandler, FC, useCallback, useEffect, useMemo, useState } from "react"
import { FormProvider, useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { Button, Checkbox, FormFieldContainer, FormFieldInputText } from "talisman-ui"
import { isCustomEvmNetwork } from "@ui/util/isCustomEvmNetwork"
import { notify } from "@talisman/components/Notifications"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { useSettings } from "@ui/hooks/useSettings"
import { useIsBuiltInEvmNetwork } from "@ui/hooks/useIsBuiltInEvmNetwork"
import { useEvmChainsList } from "@ui/hooks/useEvmChainsList"
import { useQuery } from "@tanstack/react-query"
import { TokenImage } from "@ui/domains/Asset/TokenLogo"
import { NetworkRpcsListField } from "./NetworkRpcsListField"
import { getRpcChainId } from "./helpers"
import { getNetworkFormSchema } from "./getNetworkFormSchema"
import { useCoinGeckoTokenImageUrl } from "@ui/hooks/useCoinGeckoTokenImageUrl"

const ResetNetworkButton: FC<{ network: EvmNetwork | CustomEvmNetwork }> = ({ network }) => {
  const {
    isOpen: isOpenConfirmReset,
    open: openConfirmReset,
    close: closeConfirmReset,
  } = useOpenClose()
  const handleConfirmReset = useCallback(async () => {
    try {
      await api.ethNetworkReset(network.id.toString())
      closeConfirmReset()
    } catch (err) {
      notify({
        title: "Failed to reset",
        subtitle: (err as Error).message,
        type: "error",
      })
    }
  }, [closeConfirmReset, network.id])

  return (
    <>
      <Button type="button" className="mt-8" onClick={openConfirmReset}>
        Reset to defaults
      </Button>
      <Modal open={isOpenConfirmReset && !!network} onClose={closeConfirmReset}>
        <ModalDialog title="Reset Network" onClose={closeConfirmReset}>
          <div className="text-body-secondary mt-4 space-y-16">
            <div className="text-base">
              Network <span className="text-body">{network?.name}</span> will be reset to Talisman's
              default settings.
            </div>
            <div className="grid grid-cols-2 gap-8">
              <Button onClick={closeConfirmReset}>Cancel</Button>
              <Button primary onClick={handleConfirmReset}>
                Reset
              </Button>
            </div>
          </div>
        </ModalDialog>
      </Modal>
    </>
  )
}

const RemoveNetworkButton: FC<{ network: EvmNetwork | CustomEvmNetwork }> = ({ network }) => {
  const navigate = useNavigate()

  const {
    isOpen: isOpenConfirmRemove,
    open: openConfirmRemove,
    close: closeConfirmRemove,
  } = useOpenClose()
  const handleConfirmRemove = useCallback(async () => {
    if (!network) return
    try {
      await api.ethNetworkRemove(network.id.toString())
      navigate("/networks")
    } catch (err) {
      notify({
        title: "Failed to remove",
        subtitle: (err as Error).message,
        type: "error",
      })
    }
  }, [network, navigate])

  return (
    <>
      <Button type="button" className="mt-8" onClick={openConfirmRemove}>
        Remove Network
      </Button>
      <Modal open={isOpenConfirmRemove && !!network} onClose={closeConfirmRemove}>
        <ModalDialog title="Remove Network" onClose={closeConfirmRemove}>
          <div className="text-body-secondary mt-4 space-y-16">
            <div className="text-base">
              Network <span className="text-body">{network?.name}</span> and associated tokens will
              be removed from Talisman.
            </div>
            <div className="grid grid-cols-2 gap-8">
              <Button onClick={closeConfirmRemove}>Cancel</Button>
              <Button primary onClick={handleConfirmRemove}>
                Remove
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
    tokenSymbol: nativeToken.symbol,
    tokenDecimals: nativeToken.decimals,
  }
}

const useRpcChainId = (rpcUrl: string) => {
  return useQuery({
    queryKey: ["useRpcChainId", rpcUrl],
    queryFn: () => (rpcUrl ? getRpcChainId(rpcUrl) : null),
    refetchInterval: false,
  })
}

type NetworkFormProps = {
  evmNetworkId?: string
  onSubmitted?: () => void
}

export const NetworkForm: FC<NetworkFormProps> = ({ evmNetworkId, onSubmitted }) => {
  const schema = useMemo(() => getNetworkFormSchema(evmNetworkId), [evmNetworkId])

  const qIsBuiltInEvmNetwork = useIsBuiltInEvmNetwork(
    evmNetworkId ? Number(evmNetworkId) : undefined
  )
  const evmNetwork = useEvmNetwork(evmNetworkId ? Number(evmNetworkId) : undefined)
  const nativeToken = useToken(evmNetwork?.nativeToken?.id) as CustomNativeToken | undefined
  const [submitError, setSubmitError] = useState<string>()
  const evmNetworks = useEvmNetworks()
  const { useTestnets, update } = useSettings()

  const defaultValues = useMemo(
    () => evmNetworkToFormData(evmNetwork, nativeToken),
    [evmNetwork, nativeToken]
  )

  // because of the RPC checks, validate only on submit
  const formProps = useForm<RequestUpsertCustomEvmNetwork>({
    reValidateMode: "onBlur",
    defaultValues: { isTestnet: false },
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
    formState: { errors, isValid, isSubmitting, isDirty },
  } = formProps

  const { isTestnet, rpcs, id, tokenCoingeckoId } = watch()

  // initialize form with existing values (edit mode)
  useEffect(() => {
    if (defaultValues) reset(defaultValues)
  }, [defaultValues, reset])

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

  const submit = useCallback(
    async (network: RequestUpsertCustomEvmNetwork) => {
      try {
        await api.ethNetworkUpsert(network)
        if (network.isTestnet && !useTestnets) update({ useTestnets: true })
        onSubmitted?.()
      } catch (err) {
        setSubmitError((err as Error).message)
      }
    },
    [onSubmitted, update, useTestnets]
  )

  const handleIsTestnetChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => setValue("isTestnet", e.target.checked, { shouldTouch: true }),
    [setValue]
  )

  const qEvmChainsList = useEvmChainsList()
  const autoFill = useCallback(
    async (id: number) => {
      const chainInfo = qEvmChainsList.data?.find((c) => c.chainId === id)
      if (!chainInfo) return

      setValue("name", chainInfo.name)
      setValue("blockExplorerUrl", chainInfo.explorers?.[0]?.url ?? "")
      setValue("tokenDecimals", chainInfo.nativeCurrency.decimals)
      setValue("isTestnet", chainInfo.name.toLocaleLowerCase().includes("testnet"))
      setValue("tokenSymbol", chainInfo.nativeCurrency.symbol, {
        shouldValidate: true,
        shouldTouch: true,
      })
    },
    [qEvmChainsList.data, setValue]
  )

  // attempt an autofill once chain id is detected
  useEffect(() => {
    // check only if adding a new network
    if (evmNetworkId || !id) return

    if (evmNetworks?.some((n) => n.id === id)) {
      if (!errors.id) setError("id", { message: "already exists" })
    } else {
      if (errors.id) clearErrors("id")
      autoFill(id)
    }
  }, [autoFill, clearErrors, evmNetworkId, evmNetworks, id, setError, errors.id])

  const [showRemove, showReset] = useMemo(
    () =>
      evmNetworkId && isCustomEvmNetwork(evmNetwork) && qIsBuiltInEvmNetwork.isFetched
        ? [!qIsBuiltInEvmNetwork.data, !!qIsBuiltInEvmNetwork.data]
        : [false, false],
    [evmNetwork, evmNetworkId, qIsBuiltInEvmNetwork.data, qIsBuiltInEvmNetwork.isFetched]
  )

  useEffect(() => {
    if (!tokenCoingeckoId && nativeToken?.coingeckoId)
      setValue("tokenCoingeckoId", nativeToken.coingeckoId)
  }, [nativeToken?.coingeckoId, setValue, tokenCoingeckoId])

  const tokenImageSrc = useCoinGeckoTokenImageUrl(tokenCoingeckoId)

  // on edit screen, wait for existing network to be loaded
  if (evmNetworkId && !evmNetwork) return null

  return (
    <form className="mt-24 space-y-4" onSubmit={handleSubmit(submit)}>
      <FormProvider {...formProps}>
        <NetworkRpcsListField />
        <div className="grid grid-cols-3 gap-12">
          <FormFieldContainer label="Chain ID" error={errors.id?.message}>
            <FormFieldInputText
              readOnly
              className="text-body-disabled cursor-not-allowed"
              {...register("id")}
            />
          </FormFieldContainer>
          <FormFieldContainer
            className="col-span-2"
            label="Network Name"
            error={errors.name?.message}
          >
            <FormFieldInputText placeholder="Ethereum" {...register("name")} />
          </FormFieldContainer>
        </div>
        <div className="grid grid-cols-3 gap-12">
          <FormFieldContainer label="Token Coingecko ID" error={errors.tokenCoingeckoId?.message}>
            <FormFieldInputText
              before={
                <TokenImage
                  src={tokenImageSrc}
                  className="ml-[-0.8rem] mr-[0.4rem] min-w-[3rem] text-[3rem]"
                />
              }
              placeholder="(optional)"
              {...register("tokenCoingeckoId")}
            />
          </FormFieldContainer>
          <FormFieldContainer label="Token symbol" error={errors.tokenSymbol?.message}>
            <FormFieldInputText placeholder="ETH" {...register("tokenSymbol")} />
          </FormFieldContainer>
          <FormFieldContainer label="Token decimals" error={errors.tokenDecimals?.message}>
            <FormFieldInputText
              placeholder="18"
              {...register("tokenDecimals", { valueAsNumber: true })}
            />
          </FormFieldContainer>
        </div>
        <div className="text-body-disabled mt-[-1.6rem] pb-8 text-xs">
          Talisman uses CoinGecko as source for token images. Find the API ID of the native token of
          this network on{" "}
          <a
            className="text-body-secondary hover:text-body"
            href="https://coingecko.com"
            target="_blank"
          >
            https://coingecko.com
          </a>{" "}
          and paste it here.
        </div>
        <FormFieldContainer label="Block explorer URL" error={errors.blockExplorerUrl?.message}>
          <FormFieldInputText
            placeholder="https://etherscan.io"
            {...register("blockExplorerUrl")}
          />
        </FormFieldContainer>
        <div>
          <Checkbox checked={!!isTestnet} onChange={handleIsTestnetChange}>
            <span className="text-body-secondary">Testnet</span>
          </Checkbox>
        </div>
        <div className="text-alert-warn">{submitError}</div>
        <div className="flex justify-between">
          <div>
            {showRemove && !!evmNetwork && <RemoveNetworkButton network={evmNetwork} />}
            {showReset && !!evmNetwork && <ResetNetworkButton network={evmNetwork} />}
          </div>
          <Button
            type="submit"
            className="mt-8"
            primary
            disabled={!isValid || !isDirty}
            processing={isSubmitting}
          >
            {evmNetwork ? "Update" : "Add"} Network
            <ArrowRightIcon className="ml-4 inline text-lg" />
          </Button>
        </div>
      </FormProvider>
    </form>
  )
}
