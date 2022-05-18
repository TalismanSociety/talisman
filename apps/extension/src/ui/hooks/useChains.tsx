import { api } from "@ui/api"
import { useMessageSubscription } from "./useMessageSubscription"
import type { ChainList } from "@core/types"
import { BehaviorSubject } from "rxjs"

const INITIAL_VALUE: ChainList = {}

const subscribe = (subject: BehaviorSubject<ChainList>) =>
  api.chainsSubscribe((v) => subject.next(v))

export const useChains = () => useMessageSubscription("chainsSubscribe", INITIAL_VALUE, subscribe)

export default useChains
