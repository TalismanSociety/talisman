import {
  ERRORS_STORE_INITIAL_DATA,
  ErrorsStoreData,
  errorsStore,
} from "@core/domains/app/store.errors"
import { GetRecoilValue, RecoilState, atom, selectorFamily, useRecoilState } from "recoil"

const errorsStoreState = atom<ErrorsStoreData>({
  key: "errorsStoreState",
  default: ERRORS_STORE_INITIAL_DATA,
  effects: [
    ({ setSelf }) => {
      const sub = errorsStore.observable.subscribe(setSelf)
      return () => {
        sub.unsubscribe()
      }
    },
  ],
})

export const errorsStoreQuery = selectorFamily({
  key: "errorsStoreQuery",
  get:
    <K extends keyof ErrorsStoreData>(key: K) =>
    <V extends ErrorsStoreData[K]>({ get }: { get: GetRecoilValue }): V => {
      const errors = get(errorsStoreState)
      return errors[key] as V
    },
  set: (key) => (_, value) => {
    // update the rxjs observable so the derived recoil atom is updated
    errorsStore.set({ [key]: value })
  },
})

export const useErrorsStoreValue = <K extends keyof ErrorsStoreData>(key: K) => {
  const selector = errorsStoreQuery(key) as RecoilState<ErrorsStoreData[K]>
  return useRecoilState(selector)
}
