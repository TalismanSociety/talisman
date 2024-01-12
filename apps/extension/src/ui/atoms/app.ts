import { AppStoreData, appStore } from "@core/domains/app/store.app"
import { atom, selectorFamily } from "recoil"

const appState = atom<AppStoreData>({
  key: "appState",
  effects: [
    ({ setSelf }) => {
      const sub = appStore.observable.subscribe(setSelf)
      return () => sub.unsubscribe()
    },
  ],
})

export const appStateQuery = selectorFamily({
  key: "appStateQuery",
  get:
    <K extends keyof AppStoreData, V extends AppStoreData[K]>(key: K) =>
    ({ get }): V => {
      const app = get(appState)
      return app[key] as V
    },
  set: (key) => (_, value) => {
    // update the rxjs observable so the derived recoil atom is updated
    appStore.set({ [key]: value })
  },
})
