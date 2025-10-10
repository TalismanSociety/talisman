import { Balances } from "@talismn/balances"
import { ZapFastIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC } from "react"
import { useTranslation } from "react-i18next"

import { useBondButton } from "./hooks/useBondButton"

export const BondPillButton: FC<{
  balances: Balances
  className?: string
}> = ({ balances, className }) => {
  const { t } = useTranslation()
  const { onClick } = useBondButton({ balances })

  if (!onClick) return null

  return (
    <button
      className={classNames(
        "bg-primary/10 hover:bg-primary/20 text-primary h-16 rounded-[28px] px-4 text-sm font-light",
        className,
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
