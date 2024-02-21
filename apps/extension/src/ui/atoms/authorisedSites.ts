import { AuthorizedSites } from "@core/domains/sitesAuthorised/types"
import { log } from "@core/log"
import { api } from "@ui/api"
import { atom } from "recoil"

import { atomWithSubscription } from "./utils/atomWithSubscription"

export const authorisedSitesAtom = atomWithSubscription(
  api.authorizedSitesSubscribe,
  "authorisedSitesAtom"
)

export const authorisedSitesState = atom<AuthorizedSites>({
  key: "authorisedSitesState",
  effects: [
    ({ setSelf }) => {
      log.debug("authorisedSitesState.init")
      const unsub = api.authorizedSitesSubscribe(setSelf)
      return () => unsub()
    },
  ],
})
