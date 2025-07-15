import {
  DotNetwork,
  DotNetworkSchema,
  EthNetworkSchema,
  EvmNativeTokenSchema,
  Network,
  NetworkPlatform,
  NetworkSchema,
  subNativeTokenId,
  SubNativeTokenSchema,
  TokenSchema,
} from "@talismn/chaindata-provider"
import { sleep } from "@talismn/util"
import { useForm } from "@tanstack/react-form"
import { activeNetworksStore, activeTokensStore, RequestNetworkUpsert } from "extension-core"
import { log } from "extension-shared"
import { range } from "lodash-es"
import { useTranslation } from "react-i18next"
import { useLocation, useNavigate } from "react-router-dom"
import { firstValueFrom } from "rxjs"

import { notify } from "@talisman/components/Notifications"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { getNetworkById$ } from "@ui/state"

type DotNetworkSpecifics = {
  genesisHash: `0x${string}`
  hasCheckMetadataHash: boolean
  account: DotNetwork["account"]
  existentialDeposit: string
  chainName: string
  specName: string
  specVersion: number
  prefix: number
}

type EthNetworkSpecifics = {
  preserveGasEstimate: boolean
}

export type NetworkCreateFormData = {
  platform?: NetworkPlatform
  id: string
  name: string
  isTestnet: boolean
  rpc: string
  blockExplorerUrl: string

  nativeCurrency: Partial<Network["nativeCurrency"]>

  // form data type cant use discriminators, so we handle platform specific fields with separate fields
  dotNetworkSpecifics: DotNetworkSpecifics
  ethNetworkSpecifics: EthNetworkSpecifics
}

const DEFAULT_FORM_DATA: NetworkCreateFormData = {
  id: "",
  name: "",
  isTestnet: false,
  rpc: "",
  blockExplorerUrl: "",
  nativeCurrency: {},
  dotNetworkSpecifics: {
    genesisHash: "0x",
    hasCheckMetadataHash: false,
    account: "secp256k1",
    existentialDeposit: "0",
    chainName: "",
    specName: "",
    specVersion: 0,
    prefix: 0,
  },
  ethNetworkSpecifics: {
    preserveGasEstimate: false,
  },
}

const formDataToNetwork = (formData: NetworkCreateFormData): RequestNetworkUpsert => {
  switch (formData.platform) {
    case "polkadot": {
      if (!formData.dotNetworkSpecifics) throw new Error("Missing polkadot-type network infos")

      const { existentialDeposit, ...dotNetworkSpecifics } = formData.dotNetworkSpecifics

      const nativeToken = SubNativeTokenSchema.parse({
        id: subNativeTokenId(formData.id),
        type: "substrate-native",
        platform: "polkadot",
        networkId: formData.id,
        symbol: formData.nativeCurrency.symbol,
        name: formData.nativeCurrency.name,
        decimals: formData.nativeCurrency.decimals,
        coingeckoId: formData.nativeCurrency.coingeckoId,
        logo: formData.nativeCurrency.logo,
        isDefault: true,

        existentialDeposit,
      })

      const network = DotNetworkSchema.parse({
        id: formData.id,
        platform: "polkadot",
        name: formData.name,
        isTestnet: formData.isTestnet,
        rpcs: [formData.rpc],
        blockExplorerUrls: formData.blockExplorerUrl ? [formData.blockExplorerUrl] : [],
        nativeCurrency: formData.nativeCurrency as Network["nativeCurrency"],
        nativeTokenId: nativeToken.id,

        topology: { type: "standalone" },
        ...dotNetworkSpecifics,
      })

      return { platform: "polkadot", network, nativeToken }
    }
    case "ethereum": {
      if (!formData.ethNetworkSpecifics) throw new Error("Missing ethereum-type network infos")

      const nativeToken = EvmNativeTokenSchema.parse({
        id: subNativeTokenId(formData.id!),
        type: "evm-native",
        platform: "ethereum",
        networkId: formData.id,
        symbol: formData.nativeCurrency.symbol,
        name: formData.nativeCurrency.name,
        decimals: formData.nativeCurrency.decimals,
        coingeckoId: formData.nativeCurrency.coingeckoId,
        logo: formData.nativeCurrency.logo,
        isDefault: true,
      })

      const network = EthNetworkSchema.parse({
        id: formData.id,
        platform: "ethereum",
        name: formData.name,
        isTestnet: formData.isTestnet,
        rpcs: [formData.rpc],
        blockExplorerUrls: formData.blockExplorerUrl ? [formData.blockExplorerUrl] : [],
        nativeCurrency: formData.nativeCurrency,
        nativeTokenId: nativeToken.id,

        ...formData.ethNetworkSpecifics,
      })

      return { platform: "ethereum", network, nativeToken }
    }
    default:
      throw new Error(`Unsupported platform: ${formData.platform}`)
  }
}

const validateFormData = ({ value }: { value: NetworkCreateFormData }): string | null => {
  try {
    const req = formDataToNetwork(value as NetworkCreateFormData)
    const parsedNetwork = NetworkSchema.safeParse(req.network)
    if (!parsedNetwork.success) log.error("Network validation failed", parsedNetwork.error)
    const parsedToken = TokenSchema.safeParse(req.nativeToken)
    if (!parsedToken.success) log.error("Token validation failed", parsedToken.error)

    const res =
      parsedNetwork.success &&
      parsedToken.success &&
      parsedNetwork.data.nativeTokenId === parsedToken.data.id &&
      req.platform === parsedToken.data.platform &&
      req.platform === parsedNetwork.data.platform
        ? null
        : "invalid"

    return res
  } catch (err) {
    return "invalid"
  }
}

const useNetworkCreateFormProvider = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  // wrap this in a context so the form object can be passed to sub components easily
  const form = useForm({
    defaultValues: {
      ...DEFAULT_FORM_DATA,
      platform: location.state?.platform === "all" ? undefined : location.state?.platform,
    },
    onSubmit: async ({ value }) => {
      try {
        const req = formDataToNetwork(value as NetworkCreateFormData)

        await api.networkUpsert(req)
        await activeNetworksStore.setActive(req.network.id, true)
        await activeTokensStore.setActive(req.nativeToken.id, true)

        // wait for frontend's observables to pick up the new network
        for (const _attempt of range(1, 5)) {
          if (await firstValueFrom(getNetworkById$(req.network.id)))
            return navigate(`/settings/networks-tokens/network/${req.network.id}`, {
              replace: true,
            })

          await sleep(300)
        }

        navigate(-1)
      } catch (err) {
        log.error("Failed to submit", { value, err })
        notify({
          type: "error",
          title: t("Error"),
          subtitle: (err as Error)?.message,
        })
      }
    },
    validators: {
      onMount: validateFormData,
      onChange: validateFormData,
    },
  })

  return { form }
}

export const [NetworkCreateFormProvider, useNetworkCreateForm] = provideContext(
  useNetworkCreateFormProvider,
)
