import { TokenId } from "@talismn/chaindata-provider"
import { useAtomValue } from "jotai"

import { tokenRatesAtom } from "../atoms/tokenRates"

export const useTokenRates = () => useAtomValue(tokenRatesAtom)
export const useTokenRate = (tokenId?: TokenId) => useTokenRates()[tokenId ?? ""] ?? undefined
