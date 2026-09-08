export const BITTENSOR_NETWORK_ID = "bittensor"
export const BITTENSOR_TESTNET_NETWORK_ID = "bittensor-testnet"
export const BITTENSOR_DEVNET_NETWORK_ID = "bittensor-devnet"

/** websocket url of a local subtensor node, opt-in through the BITTENSOR_DEVNET_RPC env variable (dev builds only) */
export const BITTENSOR_DEVNET_RPC =
  process.env.BUILD === "dev" ? (process.env.BITTENSOR_DEVNET_RPC ?? "") : ""

/** networks expected to serve the dtao runtime apis */
export const BITTENSOR_NETWORK_IDS: string[] = [
  BITTENSOR_NETWORK_ID,
  BITTENSOR_TESTNET_NETWORK_ID,
  ...(BITTENSOR_DEVNET_RPC ? [BITTENSOR_DEVNET_NETWORK_ID] : []),
]

export const isBittensorNetworkId = (networkId: string | null | undefined): boolean =>
  !!networkId && BITTENSOR_NETWORK_IDS.includes(networkId)

/** mainnet first, then the other networks in their original order */
export const sortBittensorNetworkIds = <T extends string>(networkIds: T[]): T[] =>
  [...networkIds].sort(
    (a, b) => Number(b === BITTENSOR_NETWORK_ID) - Number(a === BITTENSOR_NETWORK_ID)
  )

const BITTENSOR_EVM_NETWORK_ID = "964"
const BITTENSOR_TESTNET_EVM_NETWORK_ID = "945"

export type BittensorEvmPair = {
  substrateNetworkId: string
  evmNetworkId: string
}

export const BITTENSOR_EVM_PAIRS: BittensorEvmPair[] = [
  { substrateNetworkId: BITTENSOR_NETWORK_ID, evmNetworkId: BITTENSOR_EVM_NETWORK_ID },
  {
    substrateNetworkId: BITTENSOR_TESTNET_NETWORK_ID,
    evmNetworkId: BITTENSOR_TESTNET_EVM_NETWORK_ID,
  },
]

export const BITTENSOR_EVM_CHAIN_IDS = BITTENSOR_EVM_PAIRS.map((pair) => Number(pair.evmNetworkId))

export const BITTENSOR_BALANCE_TRANSFER_PRECOMPILE =
  "0x0000000000000000000000000000000000000800" as const

export const BITTENSOR_SS58_PREFIX = 42
export const BITTENSOR_EXISTENTIAL_DEPOSIT_RAO = 500n
export const BITTENSOR_WEI_PER_RAO = 1_000_000_000n

export const getBittensorEvmPairByEvmNetworkId = (
  evmNetworkId: string | null | undefined
): BittensorEvmPair | undefined =>
  BITTENSOR_EVM_PAIRS.find((pair) => pair.evmNetworkId === evmNetworkId)
