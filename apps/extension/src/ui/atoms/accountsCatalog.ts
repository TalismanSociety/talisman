import { Trees } from "@core/domains/accounts/helpers.catalog"
import { api } from "@ui/api"
import { atom } from "recoil"

export const accountsCatalogState = atom<Trees>({
  key: "accountsCatalogState",
  effects: [
    ({ setSelf }) => {
      const unsub = api.accountsCatalogSubscribe(setSelf)
      return () => unsub()
    },
  ],
})
