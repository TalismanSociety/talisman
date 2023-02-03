import { useMemo } from "react"

import { useAuthRequests } from "./useAuthRequests"

export const useAuthRequestById = (id?: string) => {
  const requests = useAuthRequests()
  return useMemo(() => requests.find((r) => r.id === id), [id, requests])
}
