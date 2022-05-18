import { EthereumNetwork, EthereumNetworkList } from "@core/types"
import { api } from "@ui/api"
import { useMemo } from "react"
import { BehaviorSubject } from "rxjs"
import { useMessageSubscription } from "./useMessageSubscription"

const sortNetworks = (a: EthereumNetwork, b: EthereumNetwork) => a.name.localeCompare(b.name)

const INITIAL_VALUE: EthereumNetworkList = {}

const subscribe = (subject: BehaviorSubject<EthereumNetworkList>) =>
  api.ethereumNetworksSubscribe((v) => subject.next(v))

export const useEthereumNetworks = () => {
  const networksList = useMessageSubscription("ethereumNetworksSubscribe", INITIAL_VALUE, subscribe)
  const networks = useMemo(() => Object.values(networksList).sort(sortNetworks), [networksList])
  return networks
}
