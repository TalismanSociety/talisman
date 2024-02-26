import { authorisedSitesAtom } from "@ui/atoms"
import { useAtomValue } from "jotai"

export const useAuthorisedSites = () => useAtomValue(authorisedSitesAtom)
