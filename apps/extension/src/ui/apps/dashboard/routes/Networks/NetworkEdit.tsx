import { CustomEvmNetwork, EvmNetwork } from "@core/domains/ethereum/types"
import { RequestUpsertCustomEvmNetwork } from "@core/domains/ethereum/types/base"
import { CustomNativeToken } from "@core/domains/tokens/types"
import { yupResolver } from "@hookform/resolvers/yup"
import { assert } from "@polkadot/util"
import HeaderBlock from "@talisman/components/HeaderBlock"
import { ArrowRightIcon } from "@talisman/theme/icons"
import { api } from "@ui/api"
import Layout from "@ui/apps/dashboard/layout"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import useToken from "@ui/hooks/useToken"
import { ethers } from "ethers"
import { ChangeEventHandler, useCallback, useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useNavigate, useParams } from "react-router-dom"
import { Button, Checkbox, FormFieldContainer } from "talisman-ui"
import * as yup from "yup"
import gql from "graphql-tag"
import { print } from "graphql"
import { graphqlUrl } from "@core/util/graphql"
import { isCustomEvmNetwork } from "@ui/util/isCustomEvmNetwork"
import { notify } from "@talisman/components/Notifications"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { useSettings } from "@ui/hooks/useSettings"
import { useDebounce } from "react-use"

const useIsBuiltInEvmNetwork = (evmNetworkId?: number) => {
  const [isLoading, setIsLoading] = useState<boolean>()
  const [error, setError] = useState<Error>()
  const [isBuiltIn, setIsBuiltIn] = useState<boolean>()

  useEffect(() => {
    if (!evmNetworkId) {
      setError(undefined)
      setIsLoading(false)
      setIsBuiltIn(undefined)
      return
    }

    const query = gql`
      query {
        evmNetworkById(id:"${evmNetworkId}") {
          id
        }
      }
    `

    setError(undefined)
    setIsBuiltIn(undefined)
    setIsLoading(true)
    fetch(graphqlUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: print(query) }),
    })
      .then((res) =>
        res
          .json()
          .then((result) => {
            setIsBuiltIn(!!result?.data?.evmNetworkById?.id)
          })
          .catch(setError)
          .finally(() => setIsLoading(false))
      )
      .catch(setError)
      .finally(() => setIsLoading(false))
  }, [evmNetworkId])

  return { isBuiltIn, isLoading, error }
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

// keep test provider object for each url so their built-in cache can be leveraged
const providersCache: Record<string, ethers.providers.JsonRpcProvider> = {}

const getRpcChainId = async (rpc: string) => {
  assert(/^https?:\/\/.+$/.test(rpc), "Invalid url")
  if (!providersCache[rpc]) providersCache[rpc] = new ethers.providers.JsonRpcProvider(rpc)
  const provider = providersCache[rpc]
  const hexChainId = await provider.send("eth_chainId", [])
  return parseInt(hexChainId, 16)
}

type EvmChainInfo = {
  chainId: number
  networkId: number
  name: string
  shortName: string
  title?: string
  chain: string // token symbol for the chain ?
  infoURL: string
  faucets?: string[]
  rpc: string[]
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  explorers?: { name: string; standard: string; url: string; icon?: string }[]
  parent?: {
    type: "L1" | "L2"
    chain: "string"
  }
  icon?: string
  ens?: { registry: string }[]
  slip44?: number
}

const useEvmChainsList = () => {
  const [isLoading, setIsLoading] = useState<boolean>()
  const [error, setError] = useState<Error>()
  const [evmChainsList, setEvmChainsList] = useState<EvmChainInfo[]>()

  useEffect(() => {
    setError(undefined)
    setEvmChainsList(undefined)
    setIsLoading(true)
    fetch("https://chainid.network/chains.json")
      .then((res) => res.json().then(setEvmChainsList))
      .catch(setError)
      .finally(() => setIsLoading(false))
  }, [])

  return { evmChainsList, isLoading, error }
}

export const NetworkEdit = () => {
  const navigate = useNavigate()
  const { id: evmNetworkId } = useParams<"id">()
  const { isBuiltIn } = useIsBuiltInEvmNetwork(evmNetworkId ? Number(evmNetworkId) : undefined)
  const evmNetwork = useEvmNetwork(evmNetworkId ? Number(evmNetworkId) : undefined)
  const nativeToken = useToken(evmNetwork?.nativeToken?.id) as CustomNativeToken | undefined
  // TODO display it
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
          //   TODO remove valueAsNumber when moving to balances v2
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
    getValues,
    setError,
    reset,
    formState: { errors, isValid, isSubmitting, isDirty },
  } = useForm<RequestUpsertCustomEvmNetwork>({
    mode: "onTouched",
    defaultValues: { isTestnet: false },
    resolver: yupResolver(schema),
  })

  // auto fill chain id
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

  useEffect(() => {
    if (defaultValues) reset(defaultValues)
  }, [defaultValues, reset])

  const { isTestnet, rpc, id } = watch()

  useDebounce(
    () => {
      // in edit mode, do not try to autodetect
      if (evmNetworkId) return

      getRpcChainId(rpc)
        .then((chainId) => {
          setValue("id", chainId)
        })
        .catch(() => {
          resetField("id")
        })
    },
    100,
    [evmNetworkId, resetField, rpc, setValue]
  )

  const handleIsTestnetChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => setValue("isTestnet", e.target.checked, { shouldTouch: true }),
    [setValue]
  )

  const { evmChainsList } = useEvmChainsList()
  // auto fill only once, or it would prevent user from beeing able to clear a field
  const autoFill = useCallback(
    async (id: number) => {
      const chainInfo = evmChainsList?.find((c) => c.chainId === id)
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
    [evmChainsList, setValue]
  )

  useEffect(() => {
    // check only if adding a new network
    if (evmNetworkId || !id) return

    if (evmNetworks?.some((n) => n.id === id)) setError("id", { message: "already exists" })
    else {
      clearErrors("id")
      autoFill(id)
    }
  }, [autoFill, clearErrors, evmNetworkId, evmNetworks, id, setError])

  const [showRemove, showReset] = useMemo(
    () =>
      evmNetworkId && isCustomEvmNetwork(evmNetwork) && typeof isBuiltIn === "boolean"
        ? [!isBuiltIn, !!isBuiltIn]
        : [false, false],
    [evmNetwork, evmNetworkId, isBuiltIn]
  )

  const {
    isOpen: isOpenConfirmReset,
    open: openConfirmReset,
    close: closeConfirmReset,
  } = useOpenClose()
  const handleConfirmReset = useCallback(async () => {
    if (!evmNetworkId) return
    try {
      await api.ethNetworkReset(evmNetworkId)
      closeConfirmReset()
    } catch (err) {
      notify({
        title: "Failed to reset",
        subtitle: (err as Error).message,
        type: "error",
      })
    }
  }, [closeConfirmReset, evmNetworkId])

  const {
    isOpen: isOpenConfirmRemove,
    open: openConfirmRemove,
    close: closeConfirmRemove,
  } = useOpenClose()
  const handleConfirmRemove = useCallback(async () => {
    if (!evmNetworkId) return
    try {
      await api.ethNetworkRemove(evmNetworkId)
      navigate("/networks")
    } catch (err) {
      notify({
        title: "Failed to remove",
        subtitle: (err as Error).message,
        type: "error",
      })
    }
  }, [evmNetworkId, navigate])

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
            placeholder="https://cloudflare-eth.com/"
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
            {showRemove && (
              <Button type="button" className="mt-8" onClick={openConfirmRemove}>
                Remove Network
              </Button>
            )}
            {showReset && (
              <Button type="button" className="mt-8" onClick={openConfirmReset}>
                Reset to defaults
              </Button>
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
      <Modal open={isOpenConfirmRemove && !!evmNetwork} onClose={closeConfirmRemove}>
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
      </Modal>
    </Layout>
  )
}
