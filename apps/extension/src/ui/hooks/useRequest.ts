import type { KnownRequest, KnownRequestId, KnownRequestTypes } from "@core/libs/requests/types"

import { useRequests } from "./useRequests"

export const useRequest = <T extends KnownRequestTypes>(id: KnownRequestId<T>) => {
  const requests = useRequests()
  const request = requests.find((req) => req.id === id)
  if (request) return request as KnownRequest<T>
  return
}
