import { Languages, createEvmClient } from "@blowfishxyz/api-client/v20230605"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { BLOWFISH_API_KEY, BLOWFISH_BASE_PATH } from "extension-shared"
import i18next from "i18next"
import urlJoin from "url-join"

import { BlowfishEvmChainInfo } from "./types"

const BLOWFISH_SUPPORTED_CHAINS: Record<EvmNetworkId, BlowfishEvmChainInfo | undefined> = {
  "1": { chainFamily: "ethereum", chainNetwork: "mainnet" },
  "11155111": { chainFamily: "ethereum", chainNetwork: "sepolia" },
  "137": { chainFamily: "polygon", chainNetwork: "mainnet" },
  "80001": { chainFamily: "polygon", chainNetwork: "mumbai" },
  "56": { chainFamily: "bnb", chainNetwork: "mainnet" },
  "42161": { chainFamily: "arbitrum", chainNetwork: "one" },
  "421614": { chainFamily: "arbitrum", chainNetwork: "sepolia" },
  "10": { chainFamily: "optimism", chainNetwork: "mainnet" },
  "11155420": { chainFamily: "optimism", chainNetwork: "sepolia" },
  "8453": { chainFamily: "base", chainNetwork: "mainnet" },
  "84532": { chainFamily: "base", chainNetwork: "sepolia" },
  "43114": { chainFamily: "avalanche", chainNetwork: "mainnet" },
  "43113": { chainFamily: "avalanche", chainNetwork: "fuji" },
  "7777777": { chainFamily: "zora", chainNetwork: "mainnet" },
  "999999999": { chainFamily: "zora", chainNetwork: "sepolia" },
  "81457": { chainFamily: "blast", chainNetwork: "mainnet" },
  "168587773": { chainFamily: "blast", chainNetwork: "sepolia" },
  "100": { chainFamily: "gnosis", chainNetwork: "mainnet" },
  "59144": { chainFamily: "linea", chainNetwork: "mainnet" },
  "666666666": { chainFamily: "degen", chainNetwork: "mainnet" },
}

// TODO remove export after personal_sign client fix
export const getBlowfishLanguage = (): Languages => {
  switch (i18next.language) {
    case "kr":
      return Languages.Ko
    case "ru":
      return Languages.Ru
    case "zh":
      return Languages.ZhCn
    default:
      return Languages.EnUs
  }
}

export const getBlowfishChainInfo = (evmNetworkId: EvmNetworkId) => {
  return BLOWFISH_SUPPORTED_CHAINS[evmNetworkId] ?? null
}

// TODO delete after personal_sign client fix
export const getBlowfishApiUrl = (evmNetworkId: EvmNetworkId) => {
  if (!BLOWFISH_SUPPORTED_CHAINS[evmNetworkId]) return null

  const config = getBlowfishChainInfo(evmNetworkId)
  if (!config) return null

  return urlJoin(BLOWFISH_BASE_PATH, config.chainFamily, "v0", config.chainNetwork)
}

export const getBlowfishClient = (evmNetworkId: EvmNetworkId) => {
  if (!BLOWFISH_SUPPORTED_CHAINS[evmNetworkId]) return null

  const config = getBlowfishChainInfo(evmNetworkId)
  if (!config) return null

  return createEvmClient({
    basePath: BLOWFISH_BASE_PATH,
    apiKey: BLOWFISH_API_KEY,
    ...config,
    language: getBlowfishLanguage(),
  })
}
