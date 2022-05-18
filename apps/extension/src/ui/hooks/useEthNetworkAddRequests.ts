import type { AddEthereumChainRequest } from "@core/types"
import { api } from "@ui/api"
import { useMessageSubscription } from "./useMessageSubscription"
import { BehaviorSubject } from "rxjs"

const INITIAL_VALUE: AddEthereumChainRequest[] = []

const subscribe = (subject: BehaviorSubject<AddEthereumChainRequest[]>) =>
  api.ethNetworkAddSubscribeRequests((v) => subject.next(v))

export const useEthNetworkAddRequests = () =>
  useMessageSubscription("subscribeEthNetworkAddRequests", INITIAL_VALUE, subscribe)
