import { selectedCurrencyState } from "@ui/atoms"
import { useRecoilValue } from "recoil"

const useSelectedCurrency = () => useRecoilValue(selectedCurrencyState)

export default useSelectedCurrency
