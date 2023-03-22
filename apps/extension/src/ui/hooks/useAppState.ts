import { appStore } from "@core/domains/app/store.app"
import { AppStoreData, DEFAULT_APP_STATE } from "@core/domains/app/store.app"
import { RecoilState, atom, selectorFamily, useRecoilState } from "recoil"

const appStateAtom = atom<AppStoreData>({
  key: "appStateAtom",
  default: DEFAULT_APP_STATE,
  effects: [
    ({ setSelf }) => {
      const sub = appStore.observable.subscribe(setSelf)
      return () => {
        sub.unsubscribe()
      }
    },
  ],
})

const appStateFamily = selectorFamily({
  key: "appStateFamily",
  get:
    <K extends keyof AppStoreData, V extends AppStoreData[K]>(key: K) =>
    ({ get }): V => {
      const appState = get(appStateAtom)
      return appState[key] as V
    },
  set: (key) => (_, value) => {
    // update the rxjs observable so the derived recoil atom is updated
    appStore.set({ [key]: value })
  },
})

export const useAppState = <K extends keyof AppStoreData>(key: K) => {
  const selector = appStateFamily(key) as RecoilState<AppStoreData[K]>
  return useRecoilState(selector)
}
