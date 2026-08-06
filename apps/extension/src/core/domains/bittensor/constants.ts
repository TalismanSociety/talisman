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
