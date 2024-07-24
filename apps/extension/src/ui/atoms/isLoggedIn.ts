import { api } from "@ui/api"

import { atomWithSubscription } from "./utils/atomWithSubscription"

export const isLoggedInAtom = atomWithSubscription<boolean>(
  (callback) => api.authStatusSubscribe((v) => callback(v === "TRUE")),
  { debugLabel: "isLoggedInAtom" }
)
