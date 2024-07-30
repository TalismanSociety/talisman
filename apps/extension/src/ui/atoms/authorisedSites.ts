import { api } from "@ui/api"

import { atomWithSubscription } from "./utils/atomWithSubscription"

export const authorisedSitesAtom = atomWithSubscription(api.authorizedSitesSubscribe, {
  debugLabel: "authorisedSitesAtom",
})
