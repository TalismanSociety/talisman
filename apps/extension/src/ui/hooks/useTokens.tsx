import { api } from "@ui/api"
import { useMessageSubscription } from "./useMessageSubscription"
import type { TokenList } from "@core/types"
import { BehaviorSubject } from "rxjs"

const INITIAL_VALUE: TokenList = {}

const subscribe = (subject: BehaviorSubject<TokenList>) =>
  api.tokensSubscribe((v) => subject.next(v))

export const useTokens = () => useMessageSubscription("tokensSubscribe", INITIAL_VALUE, subscribe)

export default useTokens
