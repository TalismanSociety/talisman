import { RecoilValue, useRecoilValue, waitForAll } from "recoil"

// performance optimization utility
// use this on top level page components to concurrently load all atoms required for first page rendering
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useRecoilPreload = (...recoilStates: RecoilValue<any>[]) =>
  useRecoilValue(waitForAll([...recoilStates]))
