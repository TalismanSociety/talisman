import type { Balance } from "@talismn/balances"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { useToken } from "@ui/state/chaindata"
import { cn } from "@ui/util/cn"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

export const AvailableBalance: FC<{
  balance: Balance | null | undefined
  tokenId?: string | null
  onMaxClick?: () => void
  className?: string
}> = ({ balance, tokenId, onMaxClick, className }) => {
  const { t } = useTranslation()
  // Resolve token from tokenId when balance is missing (e.g. user holds 0 of this token)
  const fallbackToken = useToken(!balance?.token && tokenId ? tokenId : undefined)
  const token = balance?.token ?? fallbackToken

  if (!token) return null

  return (
    <div
      className={cn(
        "flex w-full items-center justify-end gap-2 overflow-hidden text-body-secondary text-xs",
        className
      )}
    >
      <div className="text-body-disabled">{t("Bal:")}</div>
      <Tokens
        amount={balance?.transferable.tokens ?? "0"}
        symbol={token.symbol}
        noCountUp
        className="text-body-disabled"
      />
      {!!onMaxClick && !!balance?.transferable.planck && (
        <button
          type="button"
          className="rounded-full bg-grey-800 px-3 py-1 enabled:hover:bg-grey-750 enabled:hover:text-body disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onMaxClick}
        >
          {t("Max")}
        </button>
      )}
    </div>
  )
}
