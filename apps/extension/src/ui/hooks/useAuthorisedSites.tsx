import type { AuthorizedSites } from "@core/domains/sitesAuthorised/types"
import { api } from "@ui/api"
import { atom, useRecoilValue } from "recoil"

const authorisedSitesOnly = (value: AuthorizedSites): AuthorizedSites => {
  const result = { ...value }
  for (const id in result) if (!result[id].addresses && !result[id].ethAddresses) delete result[id]
  return result
}

const authorizedSitesState = atom<AuthorizedSites>({
  key: "authorizedSitesState",
  effects: [
    ({ setSelf }) => {
      const unsubscribe = api.authorizedSitesSubscribe((sites) =>
        setSelf(authorisedSitesOnly(sites))
      )
      return () => unsubscribe()
    },
  ],
})

export const useAuthorisedSites = () => useRecoilValue(authorizedSitesState)
