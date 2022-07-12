import type { AddEthereumChainRequest } from "@core/domains/ethereum/types"
import { api } from "@ui/api"
import { BehaviorSubject } from "rxjs"

import { useMessageSubscription } from "./useMessageSubscription"

const INITIAL_VALUE: AddEthereumChainRequest[] = []

const subscribe = (subject: BehaviorSubject<AddEthereumChainRequest[]>) =>
  api.ethNetworkAddSubscribeRequests((v) => subject.next(v))

export const useEthNetworkAddRequests = () =>
  useMessageSubscription("subscribeEthNetworkAddRequests", INITIAL_VALUE, subscribe)
