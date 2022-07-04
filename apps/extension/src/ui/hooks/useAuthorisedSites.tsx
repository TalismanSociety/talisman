import type { AuthorizedSites } from "@core/domains/sitesAuthorised/types"
import { api } from "@ui/api"
import { useMessageSubscription } from "@ui/hooks/useMessageSubscription"
import { BehaviorSubject } from "rxjs"

const INITIAL_VALUE: AuthorizedSites = {}

const subscribe = (subject: BehaviorSubject<AuthorizedSites>) =>
  api.authorizedSitesSubscribe((v) => subject.next(v))

const authorisedSitesOnly = (value: AuthorizedSites): AuthorizedSites => {
  const result = { ...value }
  for (let id in result) if (!result[id].addresses && !result[id].ethAddresses) delete result[id]
  return result
}

export const useAuthorisedSites = () =>
  useMessageSubscription("authorizedSitesSubscribe", INITIAL_VALUE, subscribe, authorisedSitesOnly)
