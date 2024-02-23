import { api } from "@ui/api"

import { atomWithSubscription } from "./utils/atomWithSubscription"

export const accountsCatalogAtom = atomWithSubscription(
  api.accountsCatalogSubscribe,
  "accountsCatalogAtom"
)
