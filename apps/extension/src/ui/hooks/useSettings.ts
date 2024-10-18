// import { SetStateAction, useCallback } from "react"
// import { firstValueFrom } from "rxjs"

// import { settingsStore, SettingsStoreData } from "@extension/core"
export { useSetting } from "@ui/state"

// // TODO move directly in @ui/state
// export const useSetting = <K extends keyof SettingsStoreData, V = SettingsStoreData[K]>(key: K) => {
//   const state = useSettingValue(key)

//   const setState = useCallback(
//     async (value: SetStateAction<V>) => {
//       if (typeof value === "function") {
//         const setter = value as (prev: V) => V
//         value = setter((await firstValueFrom(getSettingValue$(key))) as V)
//       }
//       await settingsStore.set({ [key]: value })
//     },
//     [key]
//   )

//   return [state, setState] as const
// }
