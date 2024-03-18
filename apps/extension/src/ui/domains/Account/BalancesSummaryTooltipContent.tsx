import { Balances } from "@talismn/balances"
import { isBooleanTrue } from "@talismn/util"
import { useAllChainsMap } from "@ui/hooks/useChains"
import { useAllEvmNetworksMap } from "@ui/hooks/useEvmNetworks"
import { useAllTokensMap } from "@ui/hooks/useTokens"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { TooltipContent } from "talisman-ui"

import { ChainLogo } from "../Asset/ChainLogo"
import { TokenLogo } from "../Asset/TokenLogo"
import { TokensAndFiat } from "../Asset/TokensAndFiat"

export const BalancesSummaryTooltipContent: FC<{ balances: Balances }> = ({ balances }) => {
  const { t } = useTranslation()
  const tokens = useAllTokensMap()
  const evmNetworks = useAllEvmNetworksMap()
  const chains = useAllChainsMap()

  const tokenBalances = useMemo(() => {
    const positiveBalances = balances.each.filter((b) => b.total.planck > 0)
    // dedupe by asset in case there are entries for staking
    const tokenIds = [...new Set(positiveBalances.map((b) => b.tokenId))]

    return tokenIds
      .map((tokenId) => {
        const token = tokens[tokenId]
        if (!token) return null
        const network =
          (token.evmNetwork && evmNetworks[token.evmNetwork.id]) ||
          (token.chain && chains[token.chain.id])
        if (!network) return null
        if (token.mirrorOf && tokenIds.includes(token.mirrorOf)) return null

        const tokenBalances = new Balances(positiveBalances.filter((b) => b.tokenId === tokenId))
        return {
          networkId: network.id,
          networkName: network.name ?? "unknown network",
          tokenId,
          symbol: token.symbol,
          total: tokenBalances.sum.planck.total,
          fiat: tokenBalances.sum.fiat("usd").total,
        }
      })
      .filter(isBooleanTrue)
      .sort((b1, b2) => {
        if (b1.fiat > b2.fiat) return -1
        if (b1.fiat < b2.fiat) return 1
        if (b1.networkName !== b2.networkName) return b1.networkName?.localeCompare(b2.networkName)
        if (b1.symbol !== b2.symbol) return b1.symbol.localeCompare(b2.symbol)
        return b2.total - b1.total > 0 ? 1 : -1
      })
  }, [balances, chains, evmNetworks, tokens])

  if (!tokenBalances.length) return null

  return (
    <TooltipContent>
      <div className="flex max-w-[30rem] flex-col gap-3 overflow-hidden p-2">
        {tokenBalances.slice(0, 5).map((b, i) => (
          <div key={`${b.tokenId}-${i}`} className="flex w-full items-center truncate">
            <TokenLogo tokenId={b.tokenId} className="h-8 w-8" />
            <span className="ml-2">
              <TokensAndFiat tokenId={b.tokenId} planck={b.total} noTooltip noCountUp isBalance />
            </span>
            <span className="mx-2">{t("on")}</span>
            <ChainLogo id={b.networkId} className="h-8 w-8" />
            <span className="ml-2 truncate">{b.networkName}</span>
          </div>
        ))}
        {tokenBalances.length > 5 && (
          <div className="col-span-2">
            {t("... and {{count}} others", { count: tokenBalances.length - 5 })}
          </div>
        )}
      </div>
    </TooltipContent>
  )
}
