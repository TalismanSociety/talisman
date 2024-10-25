import { TokenId } from "@talismn/chaindata-provider"
import { ZapFastIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { Balances } from "extension-core"
import { FC } from "react"
import { useTranslation } from "react-i18next"

import { useNomPoolBondButton } from "./useNomPoolBondButton"

export const NomPoolBondPillButton: FC<{
  tokenId: TokenId
  balances: Balances
  className?: string
}> = ({ tokenId, balances, className }) => {
  const { t } = useTranslation()
  const { onClick } = useNomPoolBondButton({ tokenId, balances })

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
