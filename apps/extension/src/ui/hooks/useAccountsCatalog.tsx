import { Tree } from "@core/domains/accounts/store.catalog"
import { api } from "@ui/api"
import { BehaviorSubject } from "rxjs"

import { useMessageSubscription } from "./useMessageSubscription"

const INITIAL_VALUE: Tree = []

const subscribe = (subject: BehaviorSubject<Tree>) =>
  api.accountsCatalogSubscribe((tree) => subject.next(tree))

// TODO migrate to recoil
export const useAccountsCatalog = () =>
  useMessageSubscription("accountsCatalogSubscribe", INITIAL_VALUE, subscribe)

export default useAccountsCatalog
