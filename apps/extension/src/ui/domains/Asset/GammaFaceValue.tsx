import { useGammaFaceValue } from "@ui/hooks/useGammaFaceValue"
import type BigNumber from "bignumber.js"
import { useTranslation } from "react-i18next"

import { Fiat } from "./Fiat"

export const GammaFaceValue = ({
  tokens,
  noCountUp,
}: {
  tokens: BigNumber.Value
  noCountUp?: boolean
}) => {
  const { t } = useTranslation()
  const faceValue = useGammaFaceValue(tokens)

  if (faceValue === null) return <>-</>

  return (
    <span className="whitespace-nowrap">
      ≈ <Fiat amount={faceValue.amount} isBalance noCountUp={noCountUp} /> {t("face value")}
    </span>
  )
}
