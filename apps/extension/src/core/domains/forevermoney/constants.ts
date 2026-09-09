import { evmErc20TokenId, evmNativeTokenId, subNativeTokenId } from "@talismn/chaindata-provider"

// ForeverMoney deployment manifest 1.1.0 (https://forevermoney.ai), addresses verified on-chain 2026-09

const FOREVERMONEY_BITTENSOR_SUBSTRATE_NETWORK_ID = "bittensor"
export const FOREVERMONEY_BITTENSOR_EVM_NETWORK_ID = "964"
export const FOREVERMONEY_BITTENSOR_SELECTOR = 2135107236357186872n

export const FOREVERMONEY_ALPHA_GATEWAY = "0x998f20Fea90bF7792774dECc7f994716442B1705" as const
export const FOREVERMONEY_ALPHA_VAULT = "0x11837459896D96F821a8D88eC93a3C8D152033D4" as const
export const FOREVERMONEY_ALPHA_TOKEN = "0xC5b6C1632d34901239396F5E1BDe54B342900256" as const
export const FOREVERMONEY_BITTENSOR_TOKEN_POOL =
  "0xB66b9c085ab711ECC373aaF6dc959a4A6B42BE2e" as const
const FOREVERMONEY_BITTENSOR_OFFRAMP = "0x51a6150400ed9F0Ae240F5D1b15E3b45Fc4339C7" as const

export const FOREVERMONEY_WTAO = "0xf3081494B87e8D5fb7960f066E931D1D0e6E3d67" as const
export const FOREVERMONEY_SPOKE_TOKEN_POOL = "0xF5AC6D6Bd12d8b87dE3c136FAc9375961577e794" as const

export type ForevermoneySpoke = {
  evmNetworkId: string
  name: string
  selector: bigint
  gateway: `0x${string}`
  offRamp: `0x${string}`
}

const FOREVERMONEY_SPOKES: ForevermoneySpoke[] = [
  {
    evmNetworkId: "8453",
    name: "Base",
    selector: 15971525489660198786n,
    gateway: "0x5EF3d7D19e4b233a1A169DA0d5CB02ec6b160a2C",
    offRamp: "0xf09AFe78d3c7d359b334d7cB88995751F7eC5E13",
  },
  {
    evmNetworkId: "4663",
    name: "Robinhood Chain",
    selector: 6180753054346818345n,
    gateway: "0x53Dcc4FE04193e489BE537F722F65317DB1E65d8",
    offRamp: "0xcDca5D374e46A6DDDab50bD2D9acB8c796eC35C3",
  },
]

export type ForevermoneyDirection = "spoke-to-substrate" | "spoke-to-evm" | "evm-to-spoke"

export type ForevermoneyRoute = {
  direction: ForevermoneyDirection
  spoke: ForevermoneySpoke
  fromTokenId: string
  toTokenId: string
  sourceNetworkId: string
  destinationNetworkId: string
  sourceSelector: bigint
  destinationOffRamp: `0x${string}`
}

const BITTENSOR_SUB_TOKEN_ID = subNativeTokenId(FOREVERMONEY_BITTENSOR_SUBSTRATE_NETWORK_ID)
const BITTENSOR_EVM_TOKEN_ID = evmNativeTokenId(FOREVERMONEY_BITTENSOR_EVM_NETWORK_ID)

export const FOREVERMONEY_ROUTES: ForevermoneyRoute[] = FOREVERMONEY_SPOKES.flatMap((spoke) => {
  const wtaoTokenId = evmErc20TokenId(spoke.evmNetworkId, FOREVERMONEY_WTAO)
  const inbound = {
    spoke,
    fromTokenId: wtaoTokenId,
    sourceNetworkId: spoke.evmNetworkId,
    destinationNetworkId: FOREVERMONEY_BITTENSOR_EVM_NETWORK_ID,
    sourceSelector: spoke.selector,
    destinationOffRamp: FOREVERMONEY_BITTENSOR_OFFRAMP,
  }
  return [
    { ...inbound, direction: "spoke-to-substrate" as const, toTokenId: BITTENSOR_SUB_TOKEN_ID },
    { ...inbound, direction: "spoke-to-evm" as const, toTokenId: BITTENSOR_EVM_TOKEN_ID },
    {
      direction: "evm-to-spoke" as const,
      spoke,
      fromTokenId: BITTENSOR_EVM_TOKEN_ID,
      toTokenId: wtaoTokenId,
      sourceNetworkId: FOREVERMONEY_BITTENSOR_EVM_NETWORK_ID,
      destinationNetworkId: spoke.evmNetworkId,
      sourceSelector: FOREVERMONEY_BITTENSOR_SELECTOR,
      destinationOffRamp: spoke.offRamp,
    },
  ]
})

export const findForevermoneyRoute = (fromTokenId: string | null, toTokenId: string | null) =>
  FOREVERMONEY_ROUTES.find(
    (route) => route.fromTokenId === fromTokenId && route.toTokenId === toTokenId
  )

export const getCcipExplorerTxUrl = (txHash: string) => `https://ccip.chain.link/tx/${txHash}`
