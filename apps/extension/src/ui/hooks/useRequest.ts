import type { KnownRequestId, KnownRequestTypes } from "@core/libs/requests/types"
import { requestQueryById } from "@ui/atoms/requests"
import { useRecoilValue } from "recoil"

export const useRequest = <T extends KnownRequestTypes>(id: KnownRequestId<T>) =>
  useRecoilValue(requestQueryById(id))
