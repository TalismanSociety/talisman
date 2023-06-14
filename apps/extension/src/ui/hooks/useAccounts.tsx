import { accountsState } from "@ui/atoms/accounts"
import { useRecoilValue } from "recoil"

export const useAccounts = () => {
  return useRecoilValue(accountsState)
}

export default useAccounts
