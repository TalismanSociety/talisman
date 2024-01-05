import { useSearchParams } from "react-router-dom"

import { useAccountByAddress } from "./useAccountByAddress"

export const useSearchParamsSelectedAccount = () => {
  const [searchParams] = useSearchParams()

  const address = searchParams.get("account")
  const account = useAccountByAddress(address !== "all" ? address : undefined) ?? undefined

  return { account }
}
