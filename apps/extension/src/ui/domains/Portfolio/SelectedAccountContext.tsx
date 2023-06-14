import { AccountJsonAny } from "@core/domains/accounts/types"
import { SettingsStoreData } from "@core/domains/app"
import { Address } from "@talismn/balances"
import { accountQueryByAddress } from "@ui/atoms/accounts"
import useAccounts from "@ui/hooks/useAccounts"
import { settingQuery, useSetting } from "@ui/hooks/useSettings"
import { useCallback } from "react"
import { RecoilState, atom, selector, useRecoilValue, useSetRecoilState } from "recoil"

const IS_POPUP = typeof window !== "undefined" && window.location.pathname === "/popup.html"

const selectedAccountAddressState = atom<Address | null>({
  key: "selectedAccountAddressState",
  default: null,
})

export const selectedAccountQuery = selector<AccountJsonAny | null>({
  key: "selectedAccountQuery",
  get: ({ get }) => {
    const addressInMemory = get(selectedAccountAddressState)
    const addressInStorage = get(
      settingQuery("selectedAccount") as RecoilState<SettingsStoreData["selectedAccount"]>
    )
    return get(accountQueryByAddress(IS_POPUP ? addressInMemory : addressInStorage))
  },
  cachePolicy_UNSTABLE: {
    eviction: "most-recent",
  },
})

export const useSelectedAccount = () => {
  const setAddress = useSetRecoilState(selectedAccountAddressState)
  const account = useRecoilValue(selectedAccountQuery)
  const accounts = useAccounts()

  const [, setPersistedAddress] = useSetting("selectedAccount")

  const select = useCallback(
    (accountOrAddress: AccountJsonAny | string | undefined) => {
      const address =
        typeof accountOrAddress === "string" ? accountOrAddress : accountOrAddress?.address
      if (IS_POPUP) setAddress(address ?? null)
      else setPersistedAddress(address)
    },
    [setAddress, setPersistedAddress]
  )

  //console.log("useSelectedAccount", { account, accounts, select })

  return { account, accounts, select }
}

// const useSelectedAccountProvider = ({ isPopup }: { isPopup?: boolean }) => {
//   //if isPopup = true, then use in memory address.
//   const [popupAccount, setPopupAccount] = useState<string>()
//   //if isPopup = false, then use address persisted in settings
//   const [selectedAccount, setSelectedAccount] = useSetting("selectedAccount")

//   const accounts = useAccounts()

//   const account = useMemo(
//     () =>
//       accounts.find((account) => account.address === (isPopup ? popupAccount : selectedAccount)),
//     [accounts, isPopup, popupAccount, selectedAccount]
//   )

//   const select = useCallback(
//     (accountOrAddress: AccountJsonAny | string | undefined) => {
//       const address =
//         typeof accountOrAddress === "string" ? accountOrAddress : accountOrAddress?.address
//       if (address === undefined || accounts.some((acc) => acc.address === address))
//         if (isPopup) setPopupAccount(address)
//         else setSelectedAccount(address)
//     },
//     [accounts, isPopup, setSelectedAccount]
//   )

//   return { select, accounts, account }
// }

// export const [SelectedAccountProvider, useSelectedAccount] = provideContext(
//   useSelectedAccountProvider
// )
