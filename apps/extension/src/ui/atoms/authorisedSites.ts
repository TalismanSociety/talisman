import { api } from "@ui/api"

import { atomWithSubscription } from "./utils/atomWithSubscription"

export const authorisedSitesAtom = atomWithSubscription(
  api.authorizedSitesSubscribe,
  "authorisedSitesAtom"
)

// export const authorisedSitesState = atom<AuthorizedSites>({
//   key: "authorisedSitesState",
//   effects: [
//     ({ setSelf }) => {
//       log.debug("authorisedSitesState.init")
//       const unsub = api.authorizedSitesSubscribe(setSelf)
//       return () => unsub()
//     },
//   ],
// })
