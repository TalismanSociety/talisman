import { AccountJsonAny } from "@core/domains/accounts/types"
import { useTalismanOrb } from "@talismn/orb"
import { api } from "@ui/api"
import { useMemo } from "react"
import { atom, useRecoilValue } from "recoil"

const TALISMAN_COLORS = ["#fd4848", "#d5ff5c"] as const

const accountsState = atom<AccountJsonAny[]>({
  key: "accountsState",
  effects: [
    ({ setSelf }) => {
      const unsubscribe = api.accountsSubscribe(setSelf)
      return () => unsubscribe()
    },
  ],
})

export const useFirstAccountColors = () => {
  // pick first account and apply it's colors to background
  const [account] = useRecoilValue(accountsState)

  const { bgColor1, bgColor2 } = useTalismanOrb(account?.address ?? "")

  return useMemo(
    () => (account ? [bgColor1, bgColor2] : TALISMAN_COLORS) as [string, string],
    [account, bgColor1, bgColor2]
  )
}
