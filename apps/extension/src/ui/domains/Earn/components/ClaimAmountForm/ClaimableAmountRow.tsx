import { FC } from "react"
import { useTranslation } from "react-i18next"

import { Fiat } from "@ui/domains/Asset/Fiat"
import { Tokens } from "@ui/domains/Asset/Tokens"

import { useClaim } from "../useClaim"

export const ClaimableAmountRow: FC = () => {
  const { t } = useTranslation()
  const { claimAmount, token } = useClaim()

  if (!claimAmount || !token) return null

  return (
    <div className="flex w-full items-center justify-between">
      <div className="text-grey-400 text-sm">{t("Claimable")}</div>
      <div className="flex items-center gap-2">
        <Tokens
          className="text-body"
          amount={claimAmount.tokens}
          decimals={token?.decimals}
          symbol={token?.symbol}
          noCountUp
          isBalance
        />
        <span className="text-body-secondary">
          (<Fiat amount={claimAmount} noCountUp isBalance />)
        </span>
      </div>
    </div>
  )
}
