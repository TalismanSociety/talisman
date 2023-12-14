import { SettingsStoreData } from "@core/domains/app/store.settings"
import { settingQuery } from "@ui/atoms"
import { RecoilState, useRecoilState } from "recoil"

export const useSetting = <K extends keyof SettingsStoreData>(setting: K) => {
  const selector = settingQuery(setting) as RecoilState<SettingsStoreData[K]>
  return useRecoilState(selector)
}
