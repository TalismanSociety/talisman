import { classNames } from "@talismn/util"
import { useToken } from "@ui/state"
import { PillButton } from "@ui/talisman-ui"
import type { FC } from "react"

import { TokenLogo } from "../../Asset/TokenLogo"

type TokenPillButtonProps = { tokenId?: string | null; className?: string; onClick?: () => void }

export const TokenPillButton: FC<TokenPillButtonProps> = ({ tokenId, className, onClick }) => {
  const token = useToken(tokenId as string)

  if (!tokenId || !token) return null

  return (
    <PillButton className={classNames("!px-4 !py-2 h-16", className)} onClick={onClick}>
      <div className="flex flex-nowrap items-center gap-4 text-base text-body">
        <div className="shrink-0">
          <TokenLogo className="!text-lg" tokenId={tokenId} />
        </div>
        <div>
          {token.type === "substrate-dtao" && token.netuid === 0 ? "Staked " : ""}
          {token.symbol}
        </div>
      </div>
    </PillButton>
  )
}
