import { AccountJsonAny } from "@core/domains/accounts/types"
import { accountsState } from "@ui/atoms"
import { searchParamsState } from "@ui/atoms/location"
import { selector, useRecoilValue } from "recoil"

export const searchParamsSelectedAccount = selector<AccountJsonAny | undefined>({
  key: "searchParamsSelectedAccount",
  get: ({ get }) => {
    const searchParams = get(searchParamsState)
    const accounts = get(accountsState)

    const address = searchParams.get("account")
    const account = accounts.find((acc) => acc.address === address)

    return account
  },
})

export const useSearchParamsSelectedAccount = () => {
  const account = useRecoilValue(searchParamsSelectedAccount)

  return { account }
}
