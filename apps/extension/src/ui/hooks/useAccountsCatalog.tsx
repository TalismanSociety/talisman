import { accountsCatalogAtom } from "@ui/atoms"
import { useAtomValue } from "jotai"

export const useAccountsCatalog = () => useAtomValue(accountsCatalogAtom)
