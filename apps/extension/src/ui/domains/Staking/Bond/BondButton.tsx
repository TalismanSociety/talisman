import type { Balances } from "@talismn/balances"
import { ZapIcon, ZapPlusIcon } from "@talismn/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

import { useBondButton } from "./hooks/useBondButton"

export const BondButton: FC<{
  balances: Balances
}> = ({ balances }) => {
  const { t } = useTranslation()
  const { onClick, isBonding } = useBondButton({ balances })

  if (!onClick) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className="flex size-[2.375rem] shrink-0 items-center justify-center rounded-full bg-primary/10 text-[1.25rem] text-primary hover:bg-primary/20"
        >
          {isBonding ? <ZapPlusIcon /> : <ZapIcon />}
        </button>
      </TooltipTrigger>
      <TooltipContent>{t("Stake")}</TooltipContent>
    </Tooltip>
  )
}
