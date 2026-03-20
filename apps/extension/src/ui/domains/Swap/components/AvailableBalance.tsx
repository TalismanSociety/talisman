import type { Balance } from "@talismn/balances"
import { cn } from "@talismn/util"
import { Tokens } from "@ui/domains/Asset/Tokens"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

export const AvailableBalance: FC<{
  balance: Balance | null | undefined
  onMaxClick?: () => void
  className?: string
}> = ({ balance, onMaxClick, className }) => {
  const { t } = useTranslation()

  if (!balance?.token) return null

  return (
    <div
      className={cn(
        "flex w-full items-center justify-end gap-2 overflow-hidden text-body-secondary text-xs",
        className
      )}
    >
      <div className="text-body-disabled">{t("Bal:")}</div>
      <Tokens
        amount={balance.transferable.tokens}
        symbol={balance.token.symbol}
        noCountUp
        className="text-body-disabled"
      />
      {!!onMaxClick && (
        <button
          type="button"
          className="rounded-full bg-grey-800 px-3 py-1 hover:bg-grey-750 hover:text-body"
          onClick={onMaxClick}
        >
          {t("Max")}
        </button>
      )}
    </div>
  )
}
