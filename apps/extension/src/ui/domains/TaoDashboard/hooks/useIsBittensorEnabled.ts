import { BITTENSOR_NETWORK_ID, useBittensorNetworkIds } from "@ui/state/bittensor"

/** true when at least one bittensor network is active */
export const useIsBittensorEnabled = () => useBittensorNetworkIds().length > 0

/** network the tao dashboard entry points open: mainnet when active, else the first active bittensor network */
export const useDefaultTaoDashboardNetworkId = () => {
  const networkIds = useBittensorNetworkIds()
  return networkIds.includes(BITTENSOR_NETWORK_ID) ? BITTENSOR_NETWORK_ID : (networkIds[0] ?? null)
}
