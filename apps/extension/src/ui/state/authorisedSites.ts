import { bind } from "@react-rxjs/core"
import { AuthorizedSites } from "extension-core"
import { Observable, shareReplay } from "rxjs"

import { api } from "@ui/api"

export const authorisedSites$ = new Observable<AuthorizedSites>((subscriber) => {
  const unsubscribe = api.authorizedSitesSubscribe((sites) => {
    subscriber.next(sites)
  })

  return () => unsubscribe()
}).pipe(shareReplay({ bufferSize: 1, refCount: true }))

export const [useAuthorisedSites] = bind(authorisedSites$)
