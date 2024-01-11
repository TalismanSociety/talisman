import { AccountsFilter, accountsQuery } from "@ui/atoms/accounts"
import { useRecoilValue } from "recoil"

export const useAccounts = (filter: AccountsFilter = "all") => {
  return useRecoilValue(accountsQuery(filter))
}

export default useAccounts
