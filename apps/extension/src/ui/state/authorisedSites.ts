import { bind } from "@react-rxjs/core"
import { AuthorizedSites } from "extension-core"
import { Observable } from "rxjs"

import { api } from "@ui/api"

export const [useAuthorisedSites, authorisedSites$] = bind(
  new Observable<AuthorizedSites>((subscriber) => {
    const unsubscribe = api.authorizedSitesSubscribe((sites) => {
      subscriber.next(sites)
    })

    return () => {
      unsubscribe()
    }
  }),
)
