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
  showTokens?: boolean
}

const TokensAndFiat = ({
  tokenAmount,
  fiat,
  token,
}: {
  tokenAmount?: string
  fiat: number | null
  token?: Token
}) => (
  <Box flex column gap={0.4}>
    <Box fg="foreground" fontsize="normal">
      <Tokens
        amount={tokenAmount ?? "0"}
        isBalance
        decimals={token?.decimals}
        symbol={token?.symbol}
      />
    </Box>
    <Box fg="mid" fontsize="small">
      {fiat === null ? "-" : <Fiat amount={fiat} currency="usd" isBalance />}
    </Box>
  </Box>
)
const FiatOnly = ({ fiat }: { fiat: number | null }) => (
  <Box fg="foreground" fontsize="normal">
    {fiat === null ? "-" : <Fiat amount={fiat} currency="usd" isBalance />}
  </Box>
)

export const Statistics = ({
  title,
  tokens,
  fiat,
  className,
  token,
  locked,
  showTokens,
}: StatisticsProps) => {
  const tokenAmount = useMemo(() => {
    return token && tokens !== undefined
      ? planckToTokens(tokens?.toString(), token.decimals)
      : undefined
  }, [token, tokens])

  return (
    <Box
      flex
      column
      bg="background-muted"
      borderradius
      padding={1.6}
      width={23.6}
      height={10}
      gap={0.8}
      className={className}
    >
      <Box flex gap={0.4} fg="mid" fontsize="small" align="center">
        {locked && <LockIcon />}
        {title}
      </Box>
      {showTokens ? (
        <TokensAndFiat tokenAmount={tokenAmount} fiat={fiat} token={token} />
      ) : (
        <FiatOnly fiat={fiat} />
      )}
    </Box>
  )
}
