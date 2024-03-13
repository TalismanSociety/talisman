import { useSearchParams } from "react-router-dom"

import { useAccountByAddress } from "./useAccountByAddress"

export const useSearchParamsSelectedAccount = () => {
  const [sp] = useSearchParams()
  return useAccountByAddress(sp.get("account"))
}
