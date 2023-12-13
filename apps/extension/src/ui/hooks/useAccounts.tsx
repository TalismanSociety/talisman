import { AccountsFilter, accountsQuery } from "@ui/atoms"
import { useRecoilValue } from "recoil"

export const useAccounts = (filter: AccountsFilter = "all") => {
  return useRecoilValue(accountsQuery(filter))
}

export default useAccounts
