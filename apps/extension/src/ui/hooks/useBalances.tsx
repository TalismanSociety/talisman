import { balancesFilterQuery } from "@ui/atoms"
import { AccountsFilter } from "@ui/atoms/accounts"
import { useRecoilValue } from "recoil"

// TODO migrate useAccounts to recoil so this hook could just call a recoil selector
export const useBalances = (accountsFilter: AccountsFilter = "all") =>
  useRecoilValue(balancesFilterQuery(accountsFilter))

export default useBalances
