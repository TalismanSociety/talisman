export const BITTENSOR_NETWORK_ID = "bittensor"
export const BITTENSOR_TESTNET_NETWORK_ID = "bittensor-testnet"

/** networks expected to serve the dtao runtime apis */
export const BITTENSOR_NETWORK_IDS: string[] = [BITTENSOR_NETWORK_ID, BITTENSOR_TESTNET_NETWORK_ID]

export const isBittensorNetworkId = (networkId: string | null | undefined): boolean =>
  !!networkId && BITTENSOR_NETWORK_IDS.includes(networkId)
