import { TokenId } from "@talismn/chaindata-provider"
import { tokenRatesByIdFamily } from "@ui/atoms"
import { useAtomValue } from "jotai"

export const useTokenRates = (tokenId?: TokenId | null) =>
  useAtomValue(tokenRatesByIdFamily(tokenId))
