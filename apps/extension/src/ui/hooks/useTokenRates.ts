import { TokenId } from "@talismn/chaindata-provider"
import { tokenRatesQuery } from "@ui/atoms/tokenRates"
import { useRecoilValue } from "recoil"

export const useTokenRates = (tokenId?: TokenId | null) => useRecoilValue(tokenRatesQuery(tokenId))
