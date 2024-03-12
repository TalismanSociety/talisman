import { ERRORS_STORE_INITIAL_DATA, ErrorsStoreData, errorsStore } from "@extension/core"
import { KeyValueAtomFamily } from "@ui/atoms/utils/types"
import { Atom, SetStateAction, atom, useAtom } from "jotai"
import { atomEffect } from "jotai-effect"
import { atomFamily } from "jotai/utils"

const errorsDataAtom = atom<ErrorsStoreData>(ERRORS_STORE_INITIAL_DATA)
const errorsEffect = atomEffect((get, set) => {
  const { unsubscribe } = errorsStore.observable.subscribe((v) => set(errorsDataAtom, v))
  return unsubscribe
})
const errorsAtom = atom((get) => {
  get(errorsEffect)
  return get(errorsDataAtom)
})

const errorsAtomFamily: KeyValueAtomFamily<ErrorsStoreData> = atomFamily((key) =>
  atom(
    (get) => {
      const state = get(errorsAtom)
      return state[key]
    },
    async (get, set, value: SetStateAction<unknown>) => {
      if (typeof value === "function") value = value(get(errorsAtom)[key])
      await errorsStore.set({ [key]: value })
    }
  )
)

export const useErrorsStoreValue = <K extends keyof ErrorsStoreData>(key: K) => {
  const selector = errorsAtomFamily(key) as Atom<ErrorsStoreData[K]>
  return useAtom(selector)
}
