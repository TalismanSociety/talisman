import {
  isNativeToken,
  isNetworkDot,
  isNetworkEth,
  Network,
  NetworkPlatform,
} from "@talismn/chaindata-provider"
import { useForm } from "@tanstack/react-form"
import { log } from "extension-shared"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { firstValueFrom } from "rxjs"

import { notify } from "@talisman/components/Notifications"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { getToken$ } from "@ui/state"

// replace rpcs field with this type so each rpc can have an id, required for drag n drop, and associate a chainId
export type RpcFormData = {
  id: string
  url: string
  chainId?: string // any chainId fetched from the rpc (genesisHash for dot, eth_chainId for eth)
}

export type NetworkEditFormData = {
  id: string
  name: string
  platform: NetworkPlatform
  isTestnet: boolean
  rpcs: RpcFormData[]
  nativeCurrency: Network["nativeCurrency"]
  blockExplorerUrl: string
  hasCheckMetadataHash?: boolean
  preserveGasEstimate?: boolean
  accountFormat?: string
}

const networkToFormData = (network: Network): NetworkEditFormData => ({
  id: network.id,
  name: network.name,
  platform: network.platform,
  isTestnet: !!network.isTestnet,
  rpcs: network.rpcs.map((url) => ({
    id: crypto.randomUUID(), // ensure each rpc has a unique id
    url: url,
    chainId: network.platform === "polkadot" ? network.genesisHash : network.id, // associate the rpc with the network's chainId
  })),
  blockExplorerUrl: network.blockExplorerUrls?.[0] ?? "",
  nativeCurrency: network.nativeCurrency,
  accountFormat: isNetworkDot(network) ? network.account : undefined,
  hasCheckMetadataHash: isNetworkDot(network) ? network.hasCheckMetadataHash : undefined,
  preserveGasEstimate: isNetworkEth(network) ? network.preserveGasEstimate : undefined,
})

const formDataToNetwork = (network: Network, formData: NetworkEditFormData): Network => {
  const newNetwork = {
    ...network,
    name: formData.name,
    isTestnet: formData.isTestnet,
    rpcs: formData.rpcs.map((rpc) => rpc.url),
    blockExplorerUrls: formData.blockExplorerUrl ? [formData.blockExplorerUrl] : [],
    nativeCurrency: formData.nativeCurrency,
  }

  if (isNetworkDot(newNetwork)) {
    newNetwork.hasCheckMetadataHash = formData.hasCheckMetadataHash
  }

  if (isNetworkEth(newNetwork)) {
    newNetwork.preserveGasEstimate = formData.preserveGasEstimate
  }

  return newNetwork
}

const useNetworkFormProvider = ({ network }: { network: Network }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const defaultValues = useMemo<NetworkEditFormData>(() => networkToFormData(network), [network])

  // wrap this in a context so the form object can be passed to sub components easily
  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      try {
        const newNetwork = formDataToNetwork(network, value)
        const nativeToken = await firstValueFrom(getToken$(newNetwork.nativeTokenId))
        const newNativeToken = Object.assign({}, nativeToken, newNetwork.nativeCurrency)

        if (!isNativeToken(newNativeToken, newNetwork.platform))
          throw new Error("Invalid native token for the network platform")

        await api.networkUpsert({
          platform: network.platform,
          network: newNetwork,
          nativeToken: newNativeToken,
        })

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
  })

  return { form, network, defaultValues }
}

export const [NetworkFormProvider, useNetworkForm] = provideContext(useNetworkFormProvider)
