import { requestsState } from "@ui/atoms/requests"
import { useRecoilValue } from "recoil"

export const useRequests = () => useRecoilValue(requestsState)
