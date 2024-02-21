import { api } from "@ui/api"

import { atomWithSubscription } from "./utils/atomWithSubscription"

export const accountsCatalogAtom = atomWithSubscription(
  api.accountsCatalogSubscribe,
  "accountsCatalogAtom"
)

// export const accountsCatalogState = atom<Trees>({
//   key: "accountsCatalogState",
//   effects: [
//     ({ setSelf }) => {
//       log.debug("accountsCatalogState.init")
//       const unsub = api.accountsCatalogSubscribe(setSelf)
//       return () => unsub()
//     },
//   ],
// })
