import type { AccountJsonAny } from "@core/domains/accounts/types"
import { api } from "@ui/api"
import { BehaviorSubject } from "rxjs"

import { useMessageSubscription } from "./useMessageSubscription"

const INITIAL_VALUE: AccountJsonAny[] = []

const subscribe = (subject: BehaviorSubject<AccountJsonAny[]>) =>
  api.accountsSubscribe((v) => subject.next(v))

export const useAccounts = () =>
  useMessageSubscription("accountsSubscribe", INITIAL_VALUE, subscribe)

export default useAccounts
