import { AccountCategory, accountsByCategoryAtomFamily } from "@ui/atoms/accounts"
import { useAtomValue } from "jotai"

export const useAccounts = (filter: AccountCategory = "all") =>
  useAtomValue(accountsByCategoryAtomFamily(filter))

export default useAccounts
