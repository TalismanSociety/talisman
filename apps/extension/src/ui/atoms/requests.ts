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
  default: [],
  effects: [
    ({ setSelf }) => {
      const unsubscribe = api.subscribeRequests(setSelf)
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
})
