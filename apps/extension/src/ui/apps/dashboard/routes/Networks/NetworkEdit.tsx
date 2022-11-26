import { CustomEvmNetwork, EvmNetwork } from "@core/domains/ethereum/types"
import { RequestUpsertCustomEvmNetwork } from "@core/domains/ethereum/types/base"
import { CustomNativeToken } from "@core/domains/tokens/types"
import { yupResolver } from "@hookform/resolvers/yup"
import HeaderBlock from "@talisman/components/HeaderBlock"
import { ArrowRightIcon } from "@talisman/theme/icons"
import { api } from "@ui/api"
import Layout from "@ui/apps/dashboard/layout"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import useToken from "@ui/hooks/useToken"
import { ethers } from "ethers"
import { ChangeEventHandler, FC, useCallback, useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useNavigate, useParams } from "react-router-dom"
import { Button, Checkbox, FormFieldContainer } from "talisman-ui"
import * as yup from "yup"
import { isCustomEvmNetwork } from "@ui/util/isCustomEvmNetwork"
import { notify } from "@talisman/components/Notifications"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { useSettings } from "@ui/hooks/useSettings"
import { useIsBuiltInEvmNetwork } from "@ui/hooks/useIsBuiltInEvmNetwork"
import { useEvmChainsList } from "@ui/hooks/useEvmChainsList"
import { useQuery } from "@tanstack/react-query"

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
              built-in settings.
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
    rpc: network.rpcs?.[0]?.url ?? "",
    blockExplorerUrl:
      network.explorerUrl ?? ("explorerUrls" in network ? network.explorerUrls?.[0] : undefined),
    isTestnet: !!network.isTestnet,
    tokenSymbol: nativeToken.symbol,
    tokenDecimals: nativeToken.decimals,
  }
}

// because of validation the same query is done 3 times minimum per url, make all await same promise
const rpcChainIdCache = new Map<string, Promise<number | null>>()

const getRpcChainId = (rpcUrl: string) => {
  // check if valid url
  if (!rpcUrl || !/^https?:\/\/.+$/.test(rpcUrl)) return null

  if (!rpcChainIdCache.has(rpcUrl)) {
    rpcChainIdCache.set(
      rpcUrl,
      new Promise((resolve) => {
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
        provider
          .send("eth_chainId", [])
          .then((hexChainId) => {
            resolve(parseInt(hexChainId, 16))
          })
          .catch(() => resolve(null))
      })
    )
  }

  return rpcChainIdCache.get(rpcUrl) as Promise<number | null>
}

const useRpcChainId = (rpcUrl: string) => {
  return useQuery({
    queryKey: ["useRpcChainId", rpcUrl],
    queryFn: () => (rpcUrl ? getRpcChainId(rpcUrl) : null),
    refetchInterval: false,
  })
}

export const NetworkEdit = () => {
  const navigate = useNavigate()
  const { id: evmNetworkId } = useParams<"id">()
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

  const schema = useMemo(
    () =>
      yup
        .object({
          // TODO remove valueAsNumber when moving to balances v2
          id: yup
            .number()
            .typeError("invalid number")
            .required("required")
            .integer("invalid number"),
          name: yup.string().required("required"),
          rpc: yup
            .string()
            .trim()
            .required("required")
            .url("invalid url")
            .test("rpc-connect", `Failed to connect`, async (newRpc) => {
              if (!newRpc) return true
              try {
                const chainId = await getRpcChainId(newRpc as string)
                return !!chainId
              } catch (err) {
                return false
              }
            })
            .test("rpc-match", `Chain ID mismatch`, async (newRpc) => {
              if (!newRpc) return true
              try {
                const chainId = await getRpcChainId(newRpc as string)
                return !evmNetworkId || Number(evmNetworkId) === chainId
              } catch (err) {
                return false
              }
            }),
          tokenSymbol: yup
            .string()
            .trim()
            .required("required")
            .min(2, "2-6 characters")
            .max(6, "2-6 characters"),
          tokenDecimals: yup
            .number()
            .typeError("invalid number")
            .required("required")
            .integer("invalid number"),
          blockExplorerUrl: yup.string().url("invalid url"),
          isTestnet: yup.boolean().required(),
        })
        .required(),
    [evmNetworkId]
  )

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
  } = useForm<RequestUpsertCustomEvmNetwork>({
    mode: "onTouched",
    defaultValues: { isTestnet: false },
    resolver: yupResolver(schema),
  })

  const { isTestnet, rpc, id } = watch()

  // initialize form with existing values (edit mode)
  useEffect(() => {
    if (defaultValues) reset(defaultValues)
  }, [defaultValues, reset])

  // auto detect chain id based on RPC url (add mode only)
  const qRpcChainId = useRpcChainId(rpc)
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
        navigate("/networks")
      } catch (err) {
        setSubmitError((err as Error).message)
      }
    },
    [navigate, update, useTestnets]
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

  // on edit screen, wait for existing network to be loaded
  if (evmNetworkId && !evmNetwork) return null

  return (
    <Layout withBack centered>
      <HeaderBlock
        title={`${evmNetwork ? "Edit" : "Add"} EVM Network`}
        text="Only ever add custom EVM compatible networks you trust."
      />
      <form className="mt-24 space-y-4" onSubmit={handleSubmit(submit)}>
        <FormFieldContainer label="RPC URL" error={errors.rpc?.message}>
          <input
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="https://1rpc.io/eth"
            className="placeholder:text-body-disabled text-body-secondary bg-grey-800 text-md h-28 w-full rounded px-12 font-light leading-none"
            {...register("rpc")}
          />
        </FormFieldContainer>
        <div className="grid grid-cols-3 gap-12">
          <FormFieldContainer label="Chain ID" error={errors.id?.message}>
            <input
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="1"
              className="placeholder:text-body-disabled text-body-secondary bg-grey-800 text-md h-28 w-full rounded px-12 font-light leading-none read-only:opacity-50"
              {...register("id", { valueAsNumber: true })}
              readOnly
            />
          </FormFieldContainer>
          <FormFieldContainer
            className="col-span-2"
            label="Network Name"
            error={errors.name?.message}
          >
            <input
              {...register("name")}
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="Ethereum"
              className="placeholder:text-body-disabled text-body-secondary bg-grey-800 text-md h-28 w-full rounded px-12 font-light leading-none"
            />
          </FormFieldContainer>
        </div>
        <div className="grid grid-cols-2 gap-12">
          <FormFieldContainer label="Token symbol" error={errors.tokenSymbol?.message}>
            <input
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="ETH"
              className="placeholder:text-body-disabled text-body-secondary bg-grey-800 text-md h-28 w-full rounded px-12 font-light leading-none"
              {...register("tokenSymbol")}
            />
          </FormFieldContainer>
          <FormFieldContainer label="Token decimals" error={errors.tokenDecimals?.message}>
            <input
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="18"
              className="placeholder:text-body-disabled text-body-secondary bg-grey-800 text-md h-28 w-full rounded px-12 font-light leading-none"
              {...register("tokenDecimals", { valueAsNumber: true })}
            />
          </FormFieldContainer>
        </div>
        <FormFieldContainer label="Block explorer URL" error={errors.blockExplorerUrl?.message}>
          <input
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="https://etherscan.io"
            className="placeholder:text-body-disabled text-body-secondary bg-grey-800 text-md h-28 w-full rounded px-12 font-light leading-none"
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
            {showRemove && !!evmNetwork && (
              <RemoveNetworkButton network={evmNetwork} />
              // <Button type="button" className="mt-8" onClick={openConfirmRemove}>
              //   Remove Network
              // </Button>
            )}
            {showReset && !!evmNetwork && (
              <ResetNetworkButton network={evmNetwork} />
              // <Button type="button" className="mt-8" onClick={openConfirmReset}>
              //   Reset to defaults
              // </Button>
            )}
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
      </form>
      {/* <Modal open={isOpenConfirmRemove && !!evmNetwork} onClose={closeConfirmRemove}>
        <ModalDialog title="Remove Network" onClose={closeConfirmRemove}>
          <div className="text-body-secondary mt-4 space-y-16">
            <div className="text-base">
              Network {evmNetwork?.name} and associated tokens will be removed from Talisman.
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
      <Modal open={isOpenConfirmReset && !!evmNetwork} onClose={closeConfirmReset}>
        <ModalDialog title="Reset Network" onClose={closeConfirmReset}>
          <div className="text-body-secondary mt-4 space-y-16">
            <div className="text-base">
              Network {evmNetwork?.name} will be reset to Talisman's built-in settings.
            </div>
            <div className="grid grid-cols-2 gap-8">
              <Button onClick={closeConfirmReset}>Cancel</Button>
              <Button primary onClick={handleConfirmReset}>
                Reset
              </Button>
            </div>
          </div>
        </ModalDialog>
      </Modal> */}
    </Layout>
  )
}
