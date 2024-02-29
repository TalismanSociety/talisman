import { AccountCategory, balancesByAccountCategoryAtomFamily } from "@ui/atoms"
import { useAtomValue } from "jotai"

export const useBalances = (category: AccountCategory = "all") =>
  useAtomValue(balancesByAccountCategoryAtomFamily(category))

export default useBalances
