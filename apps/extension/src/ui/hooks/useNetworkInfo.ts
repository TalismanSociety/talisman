import { Chain, EvmNetwork } from "@extension/core"
import { TFunction } from "i18next"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

export type NetworkInfoProps = {
  chain?: Chain | null
  evmNetwork?: EvmNetwork | null
  relay?: Chain | null
}

export const getNetworkInfo = (t: TFunction, { chain, evmNetwork, relay }: NetworkInfoProps) => {
  if (evmNetwork)
    return {
      label: evmNetwork.name,
      type: evmNetwork.isTestnet ? t("EVM Testnet") : t("EVM Blockchain"),
    }

  if (chain) {
    if (chain.isTestnet) return { label: chain.name, type: t("Testnet") }
    if (chain.paraId)
      return {
        label: chain.name,
        type: relay?.chainName
          ? t("{{name}} Parachain", { name: relay?.chainName })
          : t("Parachain"),
      }
    return {
      label: chain.name,
      type: (chain.parathreads || []).length > 0 ? t("Relay Chain") : t("Blockchain"),
    }
  }

  return { label: "", type: "" }
}

export const useNetworkInfo = ({ chain, evmNetwork, relay }: NetworkInfoProps) => {
  const { t } = useTranslation()

  return useMemo(
    () => getNetworkInfo(t, { chain, evmNetwork, relay }),
    [chain, evmNetwork, relay, t]
  )
}
