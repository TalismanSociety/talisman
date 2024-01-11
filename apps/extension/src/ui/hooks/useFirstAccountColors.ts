import { accountsState } from "@ui/atoms"
import { useRecoilValue } from "recoil"

import { useAccountColors } from "./useAccountColors"

export const useFirstAccountColors = () => {
  // pick first account and apply it's colors to background
  const [account] = useRecoilValue(accountsState)

  return useAccountColors(account?.address)
}
