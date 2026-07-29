import type { NetworkId } from "@talismn/chaindata-provider"
import { BITTENSOR_NETWORK_ID } from "@ui/state/bittensor"
import { provideContext } from "@ui/util/provideContext"

const useTaoDashboardNetworkProvider = ({ networkId }: { networkId: NetworkId }) => ({
  networkId,
  isMainnet: networkId === BITTENSOR_NETWORK_ID,
})

export const [TaoDashboardNetworkProvider, useTaoDashboardNetwork] = provideContext(
  useTaoDashboardNetworkProvider
)

export const useTaoDashboardNetworkId = () => useTaoDashboardNetwork().networkId
