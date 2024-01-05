import { AppStoreData } from "@core/domains/app/store.app"
import { appStateQuery } from "@ui/atoms"
import { RecoilState, useRecoilState } from "recoil"

export const useAppState = <K extends keyof AppStoreData>(key: K) => {
  const selector = appStateQuery(key) as RecoilState<AppStoreData[K]>
  return useRecoilState(selector)
}
