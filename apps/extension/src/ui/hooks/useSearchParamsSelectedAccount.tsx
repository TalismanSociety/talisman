import { accountByAddressQuery } from "@ui/atoms"
import { useSearchParams } from "react-router-dom"
import { useRecoilValue } from "recoil"

export const useSearchParamsSelectedAccount = () => {
  const [sp] = useSearchParams()
  return useRecoilValue(accountByAddressQuery(sp.get("account")))
}
