import { AUTH_PREFIX } from "@core/domains/sitesAuthorised/types"
import { useMemo } from "react"

import { useAuthRequests } from "./useAuthRequests"

export const useAuthRequestById = (id?: string) => {
  if (!id || !id.startsWith(AUTH_PREFIX)) throw new Error("Invalid auth request ID")
  const requests = useAuthRequests()
  return useMemo(() => requests.find((r) => r.id === id), [id, requests])
}
