import type { AnySigningRequest } from "@core/domains/signing/types"
import { SIGNING_TYPES } from "@core/domains/signing/types"

import { useRequests } from "./useRequests"

export const useSigningRequests = () => {
  const requests = useRequests()
  return requests.filter((req) =>
    Object.keys(SIGNING_TYPES).includes(req.type)
  ) as AnySigningRequest[]
}
