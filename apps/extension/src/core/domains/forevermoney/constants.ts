import { evmErc20TokenId, evmNativeTokenId, subNativeTokenId } from "@talismn/chaindata-provider"

// ForeverMoney deployment manifest 1.6.1 (@forevermoney/sdk 0.5.8), addresses verified on-chain 2026-09-24

const FOREVERMONEY_BITTENSOR_SUBSTRATE_NETWORK_ID = "bittensor"
export const FOREVERMONEY_BITTENSOR_EVM_NETWORK_ID = "964"
export const FOREVERMONEY_BITTENSOR_SELECTOR = 2135107236357186872n

// V5.1 hub sends to the spokes, the spoke gateways deliver to the V5 hub (their hub pointer is immutable)
const FOREVERMONEY_OUTBOUND_ALPHA_GATEWAY = "0xd5Fa238aa4177f6c1341491969d9cBeec94EEd69" as const
const FOREVERMONEY_INBOUND_ALPHA_GATEWAY = "0xcd0C6d98D0A126B1c113d15b4c28F38321437787" as const
export const FOREVERMONEY_ALPHA_VAULT = "0x11837459896D96F821a8D88eC93a3C8D152033D4" as const
export const FOREVERMONEY_ALPHA_TOKEN = "0xC5b6C1632d34901239396F5E1BDe54B342900256" as const
export const FOREVERMONEY_BITTENSOR_TOKEN_POOL =
  "0xB66b9c085ab711ECC373aaF6dc959a4A6B42BE2e" as const
const FOREVERMONEY_BITTENSOR_CCIP_ROUTER = "0xD941fBEcD2b971d0F54b4C34286C95faB52B60B8" as const

export const FOREVERMONEY_WTAO = "0xf3081494B87e8D5fb7960f066E931D1D0e6E3d67" as const
export const FOREVERMONEY_SPOKE_TOKEN_POOL = "0xF5AC6D6Bd12d8b87dE3c136FAc9375961577e794" as const

export type ForevermoneySpoke = {
  evmNetworkId: string
  name: string
  selector: bigint
  gateway: `0x${string}`
  ccipRouter: `0x${string}`
}

const FOREVERMONEY_SPOKES: ForevermoneySpoke[] = [
  {
    evmNetworkId: "8453",
    name: "Base",
    selector: 15971525489660198786n,
    gateway: "0x1da2415229b614C787e145D1D7346eb496319C52",
    ccipRouter: "0x881e3A65B4d4a04dD529061dd0071cf975F58bCD",
  },
  {
    evmNetworkId: "4663",
    name: "Robinhood Chain",
    selector: 6180753054346818345n,
    gateway: "0xf27fdA637131E25B2A1b4865ED9597d881980c7E",
    ccipRouter: "0x06fC836cf9839B1cd891C440A0a45242DA6Ae1c9",
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
  sourceGateway: `0x${string}`
  hubGateway: `0x${string}`
  destinationCcipRouter: `0x${string}`
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
    sourceGateway: spoke.gateway,
    hubGateway: FOREVERMONEY_INBOUND_ALPHA_GATEWAY,
    destinationCcipRouter: FOREVERMONEY_BITTENSOR_CCIP_ROUTER,
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
      sourceGateway: FOREVERMONEY_OUTBOUND_ALPHA_GATEWAY,
      hubGateway: FOREVERMONEY_OUTBOUND_ALPHA_GATEWAY,
      destinationCcipRouter: spoke.ccipRouter,
    },
  ]
})

export const findForevermoneyRoute = (fromTokenId: string | null, toTokenId: string | null) =>
  FOREVERMONEY_ROUTES.find(
    (route) => route.fromTokenId === fromTokenId && route.toTokenId === toTokenId
  )

export const getCcipExplorerTxUrl = (txHash: string) => `https://ccip.chain.link/tx/${txHash}`
