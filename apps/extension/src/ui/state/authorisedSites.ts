import type { AuthorizedSites } from "@core"
import { bind } from "@react-rxjs/core"
import { api } from "@ui/api"
import { Observable } from "rxjs"

export const [useAuthorisedSites, authorisedSites$] = bind(
  new Observable<AuthorizedSites>((subscriber) => {
    const unsubscribe = api.authorizedSitesSubscribe((sites) => {
      subscriber.next(sites)
    })

    return () => {
      unsubscribe()
    }
  })
)
