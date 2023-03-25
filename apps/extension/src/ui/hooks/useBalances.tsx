import { allBalancesState } from "@ui/atoms"
import { useRecoilValue } from "recoil"

export const useBalances = () => useRecoilValue(allBalancesState)
export default useBalances
