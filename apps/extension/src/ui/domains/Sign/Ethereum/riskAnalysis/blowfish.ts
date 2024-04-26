import { createEvmClient } from "@blowfishxyz/api-client/v20230605"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { BLOWFISH_API_KEY, BLOWFISH_BASE_PATH } from "extension-shared"

import { BlowfishEvmChainInfo } from "./types"

// TODO pull on startup from config repo, or add these to chaindata ?
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
  "7777777": { chainFamily: "zora", chainNetwork: "sepolia" },
}

export const getBlowfishChainInfo = (evmNetworkId: EvmNetworkId) => {
  return BLOWFISH_SUPPORTED_CHAINS[evmNetworkId] ?? null
}

export const getBlowfishClient = (evmNetworkId: EvmNetworkId) => {
  if (!BLOWFISH_SUPPORTED_CHAINS[evmNetworkId]) return null

  // TODO remove this check once we have a proxy
  // https://docs.blowfish.xyz/docs/wallet-integration-guide#optional-proxy-server
  if (!process.env.BLOWFISH_API_KEY) return null

  const config = getBlowfishChainInfo(evmNetworkId)
  if (!config) return null

  return createEvmClient({
    basePath: BLOWFISH_BASE_PATH,
    apiKey: BLOWFISH_API_KEY,
    ...config,
  })
}
