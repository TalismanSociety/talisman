import { AppStoreData, appStore } from "@core/domains/app/store.app"
import { walletDataState } from "@ui/atoms/main"
import { RecoilState, selector, selectorFamily, useRecoilState } from "recoil"

// export const appState = atom<AppStoreData>({
//   key: "appState",
//   effects: [
//     ({ setSelf }) => {
//       const sub = appStore.observable.subscribe(setSelf)
//       return () => {
//         sub.unsubscribe()
//       }
//     },
//   ],
// })

export const appState = selector({
  key: "appState",
  get: ({ get }) => {
    const { appState } = get(walletDataState)
    return appState
  },
})

const appStateQuery = selectorFamily({
  key: "appStateQuery",
  get:
    <K extends keyof AppStoreData, V extends AppStoreData[K]>(key: K) =>
    ({ get }): V => {
      const state = get(appState)
      return state[key] as V
    },
  set: (key) => (_, value) => {
    // update the rxjs observable so the derived recoil atom is updated
    appStore.set({ [key]: value })
  },
})

export const useAppState = <K extends keyof AppStoreData>(key: K) => {
  const selector = appStateQuery(key) as RecoilState<AppStoreData[K]>
  return useRecoilState(selector)
}
