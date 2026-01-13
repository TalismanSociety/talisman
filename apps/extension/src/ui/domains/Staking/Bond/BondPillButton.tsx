import type { Balances } from "@talismn/balances"
import { parseTokenId } from "@talismn/chaindata-provider"
import { ZapFastIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useBondButton } from "./hooks/useBondButton"

export const BondPillButton: FC<{
  balances: Balances
  isPortfolio?: boolean
  className?: string
}> = ({ balances, className, isPortfolio }) => {
  const { t } = useTranslation()

  // in portfolio, we should ignore existing staking settings if one of the balance is a native token
  // this is to prevent a current TAO staking position from being the default selection (which makes it impossible to do select root staking or non-root staking from portfolio)
  const ignoreExistingSettings = useMemo(
    () =>
      isPortfolio &&
      balances.each.some((balance) => parseTokenId(balance.tokenId).type === "substrate-native"),
    [balances, isPortfolio]
  )

  const { onClick } = useBondButton({ balances, ignoreExistingSettings })

  if (!onClick) return null

  return (
    <button
      className={classNames(
        "h-16 rounded-[28px] bg-primary/10 px-4 font-light text-primary text-sm hover:bg-primary/20",
        className
      )}
      type="button"
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <ZapFastIcon className="shrink-0 text-base" />
        <div>{t("Stake")}</div>
      </div>
    </button>
  )
}
