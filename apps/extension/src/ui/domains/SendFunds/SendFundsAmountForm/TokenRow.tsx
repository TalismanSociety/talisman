import { classNames } from "@talismn/util"
import useToken from "@ui/hooks/useToken"
import { FC } from "react"
import { PillButton } from "talisman-ui"

import { Fiat } from "../../Asset/Fiat"
import { TokenLogo } from "../../Asset/TokenLogo"
import Tokens from "../../Asset/Tokens"
import { useSendFunds } from "../useSendFunds"
import { Container } from "./Container"

type TokenPillButtonProps = { tokenId?: string | null; className?: string; onClick?: () => void }

const TokenPillButton: FC<TokenPillButtonProps> = ({ tokenId, className, onClick }) => {
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

export const TokenRow = ({ onEditClick }: { onEditClick: () => void }) => {
  const { tokenId, balance, token } = useSendFunds()

  return (
    <Container className="flex h-[50px] w-full items-center justify-between px-6 py-4">
      <div>
        <TokenPillButton tokenId={tokenId} onClick={onEditClick} />
      </div>
      <div className={classNames("text-right", balance?.status === "cache" && "animate-pulse")}>
        {balance && token && (
          <>
            <div>
              <Tokens
                amount={balance.transferable.tokens}
                decimals={token?.decimals}
                symbol={token?.symbol}
                noCountUp
                isBalance
              />
            </div>
            <div className="text-body-disabled">
              <Fiat amount={balance.transferable} noCountUp isBalance />
            </div>
          </>
        )}
      </div>
    </Container>
  )
}
