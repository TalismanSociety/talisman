import { classNames } from "@talismn/util"
import useToken from "@ui/hooks/useToken"
import { FC } from "react"
import { PillButton } from "talisman-ui"

import { TokenLogo } from "../../Asset/TokenLogo"

type TokenPillButtonProps = { tokenId?: string | null; className?: string; onClick?: () => void }

export const TokenPillButton: FC<TokenPillButtonProps> = ({ tokenId, className, onClick }) => {
  const token = useToken(tokenId as string)

  if (!tokenId || !token) return null

  return (
    <PillButton className={classNames("h-16 !px-4 !py-2", className)} onClick={onClick}>
      <div className="text-body flex  flex-nowrap items-center gap-4 text-base">
        <div className="shrink-0">
          <TokenLogo className="!text-lg" tokenId={tokenId} />
        </div>
        <div>{token.symbol}</div>
      </div>
    </PillButton>
  )
}
