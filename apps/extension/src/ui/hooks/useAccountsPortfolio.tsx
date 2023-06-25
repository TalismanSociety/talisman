import { Tree } from "@core/domains/accounts/store.portfolio"
import { api } from "@ui/api"
import { BehaviorSubject } from "rxjs"

import { useMessageSubscription } from "./useMessageSubscription"

const INITIAL_VALUE: Tree = []

const subscribe = (subject: BehaviorSubject<Tree>) =>
  api.accountsPortfolioSubscribe((tree) => subject.next(tree))

// TODO migrate to recoil
export const useAccountsPortfolio = () =>
  useMessageSubscription("accountsPortfolioSubscribe", INITIAL_VALUE, subscribe)

export default useAccountsPortfolio
