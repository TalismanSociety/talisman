import { api } from "@ui/api"
import { atomWithSubscription } from "@ui/atoms/utils/atomWithSubscription"
import { useAtomValue } from "jotai"

export const requestsAtom = atomWithSubscription(api.subscribeRequests)

export const useRequests = () => useAtomValue(requestsAtom)
