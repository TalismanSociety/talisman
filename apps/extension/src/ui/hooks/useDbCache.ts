import { dbCacheState } from "@ui/atoms"
import { useRecoilValue } from "recoil"

export const useDbCache = () => useRecoilValue(dbCacheState)
