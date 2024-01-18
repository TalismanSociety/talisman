import { tokenRatesMapState } from "@ui/atoms"
import { useRecoilValue } from "recoil"

export const useTokenRatesMap = () => useRecoilValue(tokenRatesMapState)
