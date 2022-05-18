import { EthereumNetwork, UnsubscribeFn } from "@core/types"
import { api } from "@ui/api"
import { useCallback } from "react"
import { BehaviorSubject } from "rxjs"
import { useMessageSubscription } from "./useMessageSubscription"

const INITIAL_SUBJECT_VALUE: Record<number, EthereumNetwork> = {}
const FAKE_UNSUB: UnsubscribeFn = () => {}

export const useEthereumNetwork = (id?: number): EthereumNetwork | undefined => {
  const subscribe = useCallback(
    (networks: BehaviorSubject<Record<number, EthereumNetwork>>) => {
      if (!id) return FAKE_UNSUB
      return api.ethereumNetworkSubscribe(id.toString(), (network) => {
        networks.next({ ...networks.value, [id]: network })
      })
    },
    [id]
  )

  const transform = useCallback(
    (networks: Record<number, EthereumNetwork>) => (id ? networks[id] : undefined),
    [id]
  )

  return useMessageSubscription(
    `ethereumNetworkSubscribe(${id})`,
    INITIAL_SUBJECT_VALUE,
    subscribe,
    transform
  )
}
