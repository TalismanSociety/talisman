import { Trees } from "@core/domains/accounts/store.catalog"
import { api } from "@ui/api"
import { BehaviorSubject } from "rxjs"

import { useMessageSubscription } from "./useMessageSubscription"

const INITIAL_VALUE: Trees = { portfolio: [], watched: [] }

const subscribe = (subject: BehaviorSubject<Trees>) =>
  api.accountsCatalogSubscribe((trees) => subject.next(trees))

// TODO migrate to recoil
export const useAccountsCatalog = () =>
  useMessageSubscription("accountsCatalogSubscribe", INITIAL_VALUE, subscribe)

export default useAccountsCatalog
