import type { AccountJsonAny } from "@core/types"
import { api } from "@ui/api"
import { useMessageSubscription } from "./useMessageSubscription"
import { BehaviorSubject } from "rxjs"

const INITIAL_VALUE: AccountJsonAny[] = []

const subscribe = (subject: BehaviorSubject<AccountJsonAny[]>) =>
  api.accountsSubscribe((v) => subject.next(v))

export const useAccounts = () =>
  useMessageSubscription("accountsSubscribe", INITIAL_VALUE, subscribe)

export default useAccounts
