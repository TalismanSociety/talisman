import { AccountJsonAny } from "@core/domains/accounts/types"
import { selector, waitForAll } from "recoil"

import { accountsQuery } from "./accounts"
import { searchParamsState } from "./location"
import { settingQuery } from "./settings"

const isPopup = window.location.pathname === "/popup.html"

export const searchParamsSelectedAccount = selector<AccountJsonAny | undefined>({
  key: "searchParamsSelectedAccount",
  get: ({ get }) => {
    const [searchParams, accounts] = get(waitForAll([searchParamsState, accountsQuery("all")]))
    const address = searchParams.get("account")
    return accounts.find((acc) => acc.address === address)
  },
})

export const selectedAccountState = selector<{
  account: AccountJsonAny | undefined
  accounts: AccountJsonAny[]
}>({
  key: "selectedAccountState",
  get: ({ get }) => {
    const [popupAccount, selectedAccountAddress, accounts] = get(
      waitForAll([
        searchParamsSelectedAccount,
        settingQuery("selectedAccount"),
        accountsQuery("all"),
      ])
    )

    const account = isPopup
      ? popupAccount
      : accounts.find((account) => account.address === selectedAccountAddress)

    return { account, accounts }
  },
})
