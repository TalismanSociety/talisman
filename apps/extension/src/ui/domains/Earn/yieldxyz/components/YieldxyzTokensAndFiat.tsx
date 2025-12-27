import { TokenDto } from "extension-core"
import { FC, useMemo } from "react"

import { GenericTokensAndFiat } from "@ui/domains/Asset/GenericTokensAndFiat"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"

import { useGetYieldxyzToken } from "../hooks/useGetYieldxyzToken"

export const YieldxyzTokensAndFiat: FC<{
  token: TokenDto
  amountRaw: bigint | string
  amountUsd?: string | number | null

  // shared with both TokensAndFiat and GenericTokensAndFiat
  className?: string
  as?: "span" | "div"
  noTooltip?: boolean
  noCountUp?: boolean
  isBalance?: boolean
  noFiat?: boolean
  withLogo?: boolean
  logoClassName?: string
  tokensClassName?: string
  fiatClassName?: string
}> = ({ token, amountRaw, amountUsd, ...props }) => {
  const { getYieldxyzTokenId } = useGetYieldxyzToken()

  const tokenId = useMemo(() => getYieldxyzTokenId(token), [getYieldxyzTokenId, token])

  const priceUsd = useMemo(() => {
    if (!amountUsd || !Number(amountUsd) || !BigInt(amountRaw)) return undefined
    const amount = Number(amountRaw) / 10 ** token.decimals
    return Number(amountUsd) / amount
  }, [token, amountRaw, amountUsd])

  if (tokenId) return <TokensAndFiat tokenId={tokenId} planck={amountRaw} {...props} />

  return (
    <GenericTokensAndFiat
      symbol={token.symbol}
      decimals={token.decimals}
      logo={token.logoURI}
      planck={amountRaw}
      priceUsd={priceUsd}
      {...props}
    />
  )
}
