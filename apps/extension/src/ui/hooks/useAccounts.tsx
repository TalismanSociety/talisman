import { AccountsFilter, accountsByFilterFamily } from "@ui/atoms/accounts"
import { useAtomValue } from "jotai"

export const useAccounts = (filter: AccountsFilter = "all") =>
  useAtomValue(accountsByFilterFamily(filter))

export default useAccounts
