/* eslint-disable react/display-name */
import type {
  KnownRequest,
  KnownRequestId,
  KnownRequestTypes,
  ValidRequests,
} from "@core/libs/requests/types"
import { api } from "@ui/api"
import { atom, selectorFamily } from "recoil"

export const requestsState = atom<ValidRequests[]>({
  key: "requestsState",
  effects: [
    ({ setSelf }) => {
      const key = "requestsState" + crypto.randomUUID()
      // TODO Cleanup
      // eslint-disable-next-line no-console
      console.time(key)
      const unsubscribe = api.subscribeRequests((v) => {
        // TODO Cleanup
        // eslint-disable-next-line no-console
        console.timeEnd(key)
        setSelf(v)
      })
      return () => unsubscribe()
    },
  ],
})

export const requestQueryById = selectorFamily({
  key: "requestQueryById",
  get:
    <T extends KnownRequestTypes>(id: KnownRequestId<T>) =>
    ({ get }) => {
      const requests = get(requestsState)
      const request = requests.find((req) => req.id === id)
      return request ? (request as KnownRequest<T>) : null
    },
  cachePolicy_UNSTABLE: {
    eviction: "most-recent",
  },
})
