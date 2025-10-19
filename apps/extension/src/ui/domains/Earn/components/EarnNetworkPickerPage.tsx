import { TokenId } from "@talismn/chaindata-provider"
import { ChevronLeftIcon } from "@talismn/icons"
import { FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { IconButton } from "talisman-ui"

import { Fiat } from "@ui/domains/Asset/Fiat"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { useBalances, useNetworksMapById } from "@ui/state"

import { useTokensBySymbol } from "../utils/tokenUtils"

interface EarnNetworkPickerPageProps {
  tokenSymbol: string
  onSelect: (tokenId: TokenId) => void
}

export const EarnNetworkPickerPage: FC<EarnNetworkPickerPageProps> = ({
  tokenSymbol,
  onSelect,
}) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const networksMap = useNetworksMapById()
  const userBalances = useBalances("owned")

  // Get all tokens with the same symbol across different networks
  const availableTokens = useTokensBySymbol(tokenSymbol, true)

  const tokenNetworkOptions = useMemo(() => {
    return availableTokens.map((token) => {
      const network = networksMap[token.networkId]
      const balance = userBalances.find({ tokenId: token.id })
      const individualBalance = balance?.each.find((b) => b.tokenId === token.id)

      return {
        token,
        network,
        balance: individualBalance,
        tokenId: token.id,
      }
    })
  }, [availableTokens, networksMap, userBalances])

  const handleTokenSelect = useCallback(
    (tokenId: TokenId) => {
      onSelect(tokenId)
      // Navigation will be handled by the wrapper component
    },
    [onSelect],
  )

  const handleBack = useCallback(() => {
    navigate(-1)
  }, [navigate])

  return (
    <div className="flex size-full flex-grow flex-col bg-black">
      <header className="flex items-center justify-between p-10">
        <IconButton onClick={handleBack}>
          <ChevronLeftIcon />
        </IconButton>
        <div>{t("Select a network")}</div>
        <IconButton onClick={handleBack} className="invisible">
          <ChevronLeftIcon />
        </IconButton>
      </header>
      <div className="flex grow flex-col overflow-hidden px-10 pb-10">
        <div className="space-y-2">
          {tokenNetworkOptions.length === 0 ? (
            <div className="text-body-secondary py-8 text-center text-sm">
              {t("No networks available for {{symbol}}", { symbol: tokenSymbol })}
            </div>
          ) : (
            tokenNetworkOptions.map(({ token, network, balance, tokenId }) => (
              <button
                key={tokenId}
                type="button"
                className="bg-grey-850 hover:bg-grey-800 flex w-full items-center gap-4 rounded-lg p-4 text-left transition-colors"
                onClick={() => handleTokenSelect(tokenId)}
              >
                <div className="flex items-center gap-3">
                  <div className="text-xl">
                    <TokenLogo tokenId={tokenId} />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-lg">
                      <img
                        src={network?.logo}
                        alt={network?.name}
                        className="h-6 w-6 rounded-full"
                      />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{token.symbol}</span>
                        {network?.isTestnet && (
                          <span className="bg-alert-warn/10 text-alert-warn rounded px-2 py-1 text-xs">
                            {t("Testnet")}
                          </span>
                        )}
                      </div>
                      <div className="text-body-secondary text-sm">{network?.name}</div>
                    </div>
                  </div>
                </div>

                <div className="ml-auto text-right">
                  {balance && balance.total.planck > 0n ? (
                    <div className="flex flex-col gap-1">
                      <div className="font-medium text-white">
                        <Tokens
                          amount={balance.total.tokens}
                          decimals={token.decimals}
                          symbol={token.symbol}
                          isBalance
                        />
                      </div>
                      <div className="text-body-secondary text-sm">
                        <Fiat amount={balance.total.fiat("usd")} isBalance />
                      </div>
                    </div>
                  ) : (
                    <div className="text-body-secondary text-sm">{t("No balance")}</div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
