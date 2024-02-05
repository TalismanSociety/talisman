import { RemoteConfigStoreData, remoteConfigStore } from "@core/domains/app/store.remoteConfig"
import { log } from "@core/log"
import { atom } from "recoil"

export const remoteConfigState = atom<RemoteConfigStoreData>({
  key: "remoteConfigState",
  effects: [
    ({ setSelf }) => {
      log.debug("remoteConfigState.init")
      const sub = remoteConfigStore.observable.subscribe(setSelf)
      return () => sub.unsubscribe()
    },
  ],
})
