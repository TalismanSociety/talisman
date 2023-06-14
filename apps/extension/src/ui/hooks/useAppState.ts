import { appStore } from "@core/domains/app/store.app"
import { AppStoreData } from "@core/domains/app/store.app"
import { RecoilState, atom, selectorFamily, useRecoilState } from "recoil"

export const appState = atom<AppStoreData>({
  key: "appState",
  effects: [
    ({ setSelf }) => {
      const key = "appState" + crypto.randomUUID()
      // TODO Cleanup
      // eslint-disable-next-line no-console
      console.time(key)
      const sub = appStore.observable.subscribe((v) => {
        // TODO Cleanup
        // eslint-disable-next-line no-console
        console.timeEnd(key)
        setSelf(v)
      })
      return () => {
        sub.unsubscribe()
      }
    },
  ],
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
  cachePolicy_UNSTABLE: {
    eviction: "most-recent",
  },
})

export const useAppState = <K extends keyof AppStoreData>(key: K) => {
  const selector = appStateQuery(key) as RecoilState<AppStoreData[K]>
  return useRecoilState(selector)
}
