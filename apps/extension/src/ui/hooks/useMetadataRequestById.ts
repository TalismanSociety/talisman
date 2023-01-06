import { useMemo } from "react"

import { useMetadataRequests } from "./useMetadataRequests"

export const useMetadataRequestById = (id?: string) => {
  const requests = useMetadataRequests()
  return useMemo(() => requests.find((r) => r.id === id), [id, requests])
}
