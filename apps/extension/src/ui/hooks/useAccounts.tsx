import { accountsState } from "@ui/atoms/accounts"
import { useRecoilValue } from "recoil"

export const useAccounts = () => useRecoilValue(accountsState)

export default useAccounts
