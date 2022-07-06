import { api } from "@ui/api"
import { useMessageSubscription } from "@ui/hooks/useMessageSubscription"
import type { AuthorizedSites } from "@core/types"
import { BehaviorSubject } from "rxjs"

const INITIAL_VALUE: AuthorizedSites = {}

const subscribe = (subject: BehaviorSubject<AuthorizedSites>) =>
  api.authorizedSitesSubscribe((v) => subject.next(v))

const authorisedSitesOnly = (value: AuthorizedSites): AuthorizedSites => {
  const result = { ...value }
  for (const id in result) if (!result[id].addresses && !result[id].ethAddresses) delete result[id]
  return result
}

export const useAuthorisedSites = () =>
  useMessageSubscription("authorizedSitesSubscribe", INITIAL_VALUE, subscribe, authorisedSitesOnly)
