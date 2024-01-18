import { accountsCatalogState } from "@ui/atoms"
import { useRecoilValue } from "recoil"

export const useAccountsCatalog = () => useRecoilValue(accountsCatalogState)
