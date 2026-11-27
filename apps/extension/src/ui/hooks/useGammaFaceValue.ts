import { subNativeTokenId } from "@talismn/chaindata-provider"
import { getGammaFaceValue } from "@talismn/token-rates"
import { useSelectedCurrency } from "@ui/state/settings"
import { useTokenRates } from "@ui/state/tokenRates"
import BigNumber from "bignumber.js"
import { useMemo } from "react"

const TAO_TOKEN_ID = subNativeTokenId("bittensor")

type GammaFaceValueAmount = { readonly kind: "gamma-face-value"; amount: number }

export const useGammaFaceValue = (tokens: BigNumber.Value): GammaFaceValueAmount | null => {
  const taoRates = useTokenRates(TAO_TOKEN_ID)
  const currency = useSelectedCurrency()

  return useMemo(() => {
    if (!taoRates) return null
    const faceValue = getGammaFaceValue({ [TAO_TOKEN_ID]: taoRates }, TAO_TOKEN_ID, currency)
    if (!faceValue) return null
    return {
      kind: "gamma-face-value",
      amount: BigNumber(tokens).times(faceValue.perGamma).toNumber(),
    }
  }, [taoRates, currency, tokens])
}
