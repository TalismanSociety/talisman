import { authorisedSitesState } from "@ui/atoms"
import { useRecoilValue } from "recoil"

export const useAuthorisedSites = () => useRecoilValue(authorisedSitesState)
