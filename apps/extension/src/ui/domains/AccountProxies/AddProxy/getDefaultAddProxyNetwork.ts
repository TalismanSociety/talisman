import { BITTENSOR_NETWORK_ID } from "@core/domains/bittensor/exports"

type AddProxyNetworkOption = {
  id: string
  name?: string | null
}

const getSortName = (network: AddProxyNetworkOption) => network.name ?? network.id

export const getDefaultAddProxyNetwork = <T extends AddProxyNetworkOption>(networks: T[]) =>
  networks.find((network) => network.id === BITTENSOR_NETWORK_ID) ??
  networks.concat().sort((a, b) => getSortName(a).localeCompare(getSortName(b)))[0]
