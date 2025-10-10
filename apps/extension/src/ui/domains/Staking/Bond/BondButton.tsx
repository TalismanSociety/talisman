import { Balances } from "@talismn/balances"
import { ZapIcon, ZapPlusIcon } from "@talismn/icons"
import { FC } from "react"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { type StakeType } from "../Bittensor/hooks/useBittensorBondWizard"
import { useBondButton } from "./hooks/useBondButton"

export const BondButton: FC<{
  balances: Balances
  stakeType?: StakeType
  netuid?: number
}> = ({ balances, stakeType, netuid }) => {
  const { t } = useTranslation()
  const { onClick, isBonding } = useBondButton({ balances, stakeType, netuid })

  if (!onClick) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className="text-primary bg-primary/10 hover:bg-primary/20 flex size-[3.8rem] shrink-0 items-center justify-center rounded-full text-[2rem]"
        >
          {isBonding ? <ZapPlusIcon /> : <ZapIcon />}
        </button>
      </TooltipTrigger>
      <TooltipContent>{t("Stake")}</TooltipContent>
    </Tooltip>
  )
}
