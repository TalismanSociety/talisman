import { tokenRatesMapState } from "@ui/atoms/tokenRates"
import { useRecoilValue } from "recoil"

export const useTokenRatesMap = () => useRecoilValue(tokenRatesMapState)
