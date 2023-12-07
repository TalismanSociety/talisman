import { accountsCatalogState } from "@ui/atoms/accounts"
import { useRecoilValue } from "recoil"

export const useAccountsCatalog = () => useRecoilValue(accountsCatalogState)

export default useAccountsCatalog
