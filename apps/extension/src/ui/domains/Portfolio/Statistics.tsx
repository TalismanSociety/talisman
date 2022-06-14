import { Token } from "@core/types"
import { planckToTokens } from "@core/util"
import { Box } from "@talisman/components/Box"
import { LockIcon } from "@talisman/theme/icons"
import { ReactNode, useMemo } from "react"
import Fiat from "../Asset/Fiat"
import Tokens from "../Asset/Tokens"

type StatisticsProps = {
  title: ReactNode
  tokens?: bigint
  fiat: number | null
  className?: string
  token?: Token
  locked?: boolean
}

export const Statistics = ({ title, tokens, fiat, className, token, locked }: StatisticsProps) => {
  const tokenAmount = useMemo(() => {
    return token && tokens !== undefined
      ? planckToTokens(tokens?.toString(), token.decimals)
      : undefined
  }, [token, tokens])

  const showBoth = useMemo(() => fiat !== null && tokenAmount !== undefined, [fiat, tokenAmount])

  return (
    <Box
      flex
      column
      bg="background-muted"
      borderradius
      padding={1.6}
      width={23.6}
      gap={0.8}
      className={className}
    >
      <Box flex gap={0.4} fg="mid" fontsize="small" align="center">
        {locked && <LockIcon />}
        {title}
      </Box>
      <Box fontsize="medium">
        {tokenAmount ? (
          <Tokens
            amount={tokenAmount}
            isBalance
            decimals={token?.decimals}
            symbol={token?.symbol}
          />
        ) : null}
        <Box inline fg={showBoth ? "mid" : "foreground"}>
          {showBoth ? " / " : null}
          {fiat === null ? null : <Fiat amount={fiat} currency="usd" isBalance />}
        </Box>
      </Box>
    </Box>
  )
}
