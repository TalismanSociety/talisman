import { TokenId } from "@talismn/chaindata-provider"
import { ZapIcon, ZapPlusIcon } from "@talismn/icons"
import { Balances } from "extension-core"
import { FC } from "react"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { useBondButton } from "./useBondButton"

export const BondButton: FC<{ tokenId: TokenId; balances: Balances }> = ({ tokenId, balances }) => {
  const { t } = useTranslation()
  const { onClick, isNomPoolStaking } = useBondButton({ tokenId, balances })

  if (!onClick) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className="text-primary bg-primary/10 hover:bg-primary/20 flex size-[3.8rem] shrink-0 items-center justify-center rounded-full text-[2rem]"
        >
          {isNomPoolStaking ? <ZapPlusIcon /> : <ZapIcon />}
        </button>
      </TooltipTrigger>
      <TooltipContent>{t("Stake")}</TooltipContent>
    </Tooltip>
  )
}
