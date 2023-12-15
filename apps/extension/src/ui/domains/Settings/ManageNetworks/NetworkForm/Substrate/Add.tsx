import { yupResolver } from "@hookform/resolvers/yup"
import { useQuery } from "@tanstack/react-query"
import useChains from "@ui/hooks/useChains"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useDebounce } from "react-use"

import { SubNetworkForm } from "./Form"
import { getSubstrateRpcInfo } from "./helpers"
import { subNetworkFormSchema } from "./schema"
import { SubNetworkFormBaseProps, SubNetworkFormData } from "./types"

const DEFAULT_VALUES: Partial<SubNetworkFormData> = {
  accountFormat: "*25519",
  rpcs: [{ url: "" }], // provides one empty row
}

export const SubNetworkFormAdd = ({ onSubmitted }: SubNetworkFormBaseProps) => {
  const { t } = useTranslation("admin")

  const { chains } = useChains({ activeOnly: false, includeTestnets: true })

  const formProps = useForm<SubNetworkFormData>({
    mode: "all",
    defaultValues: DEFAULT_VALUES,
    resolver: yupResolver(subNetworkFormSchema),
  })

  const {
    setValue,
    watch,
    resetField,
    clearErrors,
    setError,
    formState: { errors },
  } = formProps

  const { rpcs, id } = watch()

  // auto detect genesis hash (and token deets) based on RPC url (add mode only)
  const rpcInfo = useRpcInfo(rpcs?.[0]?.url)
  useEffect(() => {
    if (!rpcInfo.isFetched) return
    const rpcId = rpcInfo.data && `custom-${rpcInfo.data.genesisHash}`
    if (rpcInfo.data && rpcId && rpcId !== id) {
      setValue("id", rpcId, { shouldValidate: true, shouldTouch: true, shouldDirty: true })
      setValue("genesisHash", rpcInfo.data.genesisHash as `0x${string}`, {
        shouldValidate: true,
        shouldTouch: true,
        shouldDirty: true,
      })
      setValue("nativeTokenSymbol", rpcInfo.data.token.symbol, {
        shouldValidate: true,
        shouldTouch: true,
        shouldDirty: true,
      })
      setValue("nativeTokenDecimals", rpcInfo.data.token.decimals, {
        shouldValidate: true,
        shouldTouch: true,
        shouldDirty: true,
      })
    } else if (!!id && !rpcInfo.data) {
      resetField("id")
      resetField("genesisHash")
      resetField("nativeTokenSymbol")
      resetField("nativeTokenDecimals")
    }
  }, [id, resetField, setValue, rpcInfo.isFetched, rpcInfo.data])

  useEffect(() => {
    // check only if adding a new network
    if (!id) return

    if (chains?.some((c) => c.id === id)) {
      if (!errors.id) setError("id", { message: t("already exists") })
    } else {
      if (errors.id) clearErrors("id")
    }
  }, [clearErrors, id, setError, errors.id, t, chains])

  return (
    <SubNetworkForm
      formProps={formProps}
      onSubmitted={onSubmitted}
      submitButtonText={t("Add Network")}
      title={t("Add Custom Substrate Network")}
    />
  )
}

const useRpcInfo = (rpcUrl: string) => {
  const [debouncedRpcUrl, setDebouncedRpcUrl] = useState(rpcUrl)
  useDebounce(
    () => {
      setDebouncedRpcUrl(rpcUrl)
    },
    250,
    [rpcUrl]
  )

  return useQuery({
    queryKey: ["useRpcGenesisHash", debouncedRpcUrl],
    queryFn: () => (debouncedRpcUrl ? getSubstrateRpcInfo(debouncedRpcUrl) : null),
    refetchInterval: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  })
}
