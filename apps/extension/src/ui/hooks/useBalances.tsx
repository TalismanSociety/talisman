import { AccountsFilter, balancesFilterQuery } from "@ui/atoms"
import { useRecoilValue } from "recoil"

export const useBalances = (accountsFilter: AccountsFilter = "all") =>
  useRecoilValue(balancesFilterQuery(accountsFilter))

export default useBalances
