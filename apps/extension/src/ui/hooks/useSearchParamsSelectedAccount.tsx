import { accountsByAddressAtomFamily } from "@ui/atoms"
import { useAtomValue } from "jotai"
import { useSearchParams } from "react-router-dom"

export const useSearchParamsSelectedAccount = () => {
  const [sp] = useSearchParams()
  return useAtomValue(accountsByAddressAtomFamily(sp.get("account")))
}
