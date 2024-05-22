import { yupResolver } from "@hookform/resolvers/yup"
import { CustomSubNativeToken, SubNativeToken } from "@talismn/balances"
import { Chain, ChainId, CustomChain, isCustomChain } from "@talismn/chaindata-provider"
import useChain from "@ui/hooks/useChain"
import { useIsBuiltInChain } from "@ui/hooks/useIsBuiltInChain"
import useToken from "@ui/hooks/useToken"
import { useEffect, useMemo, useRef } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { SubNetworkForm } from "./Form"
import { RemoveSubNetworkButton } from "./RemoveSubNetworkButton"
import { ResetSubNetworkButton } from "./ResetSubNetworkButton"
import { subNetworkFormSchema } from "./schema"
import { SubNetworkFormBaseProps, SubNetworkFormData } from "./types"

export type SubNetworkFormEditProps = SubNetworkFormBaseProps & {
  chainId?: ChainId
}

export const SubNetworkFormEdit = ({ chainId, onSubmitted }: SubNetworkFormEditProps) => {
  const { t } = useTranslation("admin")
  const isBuiltInChain = useIsBuiltInChain(chainId)

  const chain = useChain(chainId)
  const nativeToken = useToken(chain?.nativeToken?.id) as
    | CustomSubNativeToken
    | SubNativeToken
    | undefined

  const defaultValues = useMemo(() => {
    return chain ? chainToFormData(chain, nativeToken) : undefined
  }, [chain, nativeToken])

  const isCustom = useMemo(() => !!chain && isCustomChain(chain), [chain])

  const formProps = useForm<SubNetworkFormData>({
    mode: "all",
    defaultValues,
    resolver: yupResolver(subNetworkFormSchema),
  })

  const { reset } = formProps
  // initialize form with existing values (edit mode), only once, needed
  // to get nested fields to show up
  const initialized = useRef(false)
  useEffect(() => {
    if (defaultValues && !initialized.current) {
      reset(defaultValues)
      initialized.current = true
    }
  }, [defaultValues, reset])

  const [showRemove, showReset] = useMemo(
    () =>
      isCustom && isBuiltInChain.isFetched
        ? [!isBuiltInChain.data, !!isBuiltInChain.data]
        : [false, false],
    [isCustom, isBuiltInChain.data, isBuiltInChain.isFetched]
  )

  // on edit screen, wait for existing chain to be loaded
  if (chainId && !defaultValues) return null

  return (
    <SubNetworkForm
      formProps={formProps}
      onSubmitted={onSubmitted}
      title={isCustom ? t("Edit Custom Substrate Network") : t("Edit Substrate Network")}
      submitButtonText={t("Update Network")}
    >
      <div>
        {chain && showRemove && <RemoveSubNetworkButton chain={chain} />}
        {chain && showReset && <ResetSubNetworkButton chain={chain} />}
      </div>
    </SubNetworkForm>
  )
}

const chainToFormData = (
  chain?: Chain | CustomChain,
  nativeToken?: SubNativeToken | CustomSubNativeToken
): SubNetworkFormData | undefined => {
  if (!chain) return undefined

  return {
    id: chain.id,
    isTestnet: chain.isTestnet,
    genesisHash: chain.genesisHash,
    name: chain.name ?? "",
    chainLogoUrl: chain.logo ?? null,
    nativeTokenSymbol: nativeToken?.symbol ?? "Unit",
    nativeTokenDecimals: nativeToken?.decimals ?? 0,
    nativeTokenCoingeckoId: nativeToken?.coingeckoId ?? "",
    nativeTokenLogoUrl: nativeToken?.logo ?? null,
    accountFormat: chain.account,
    subscanUrl: chain.subscanUrl,
    rpcs:
      chain?.rpcs?.map((rpc) => ({ url: rpc.url, genesisHash: chain.genesisHash ?? undefined })) ??
      [],
  }
}
