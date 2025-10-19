import { TokenId } from "@talismn/chaindata-provider"
import { XIcon } from "@talismn/icons"
import { FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { IconButton, Modal } from "talisman-ui"

import { Fiat } from "@ui/domains/Asset/Fiat"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { useBalances, useNetworksMapById } from "@ui/state"
import { IS_POPUP } from "@ui/util/constants"

import { useTokensBySymbol } from "../utils/tokenUtils"

interface EarnNetworkPickerProps {
  isOpen: boolean
  tokenSymbol: string
  onDismiss: () => void
  onSelect: (tokenId: TokenId) => void
}

export const EarnNetworkPicker: FC<EarnNetworkPickerProps> = ({
  isOpen,
  tokenSymbol,
  onDismiss,
  onSelect,
}) => {
  const { t } = useTranslation()
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
      onDismiss()
    },
    [onSelect, onDismiss],
  )

  if (!isOpen) return null

  // In popup mode, don't render the modal - the page will handle the full page view
  if (IS_POPUP) {
    return null
  }

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={onDismiss}>
      <div className="bg-grey-900 border-grey-800 relative flex h-[60rem] max-h-[100dvh] w-[40rem] max-w-[100dvw] flex-col overflow-hidden rounded border">
        <div className="flex w-full items-center justify-between gap-4 overflow-hidden p-10">
          <div />
          <h1 className="flex-grow overflow-hidden text-ellipsis whitespace-nowrap text-center text-[1.5rem] font-[650] leading-[1.4] tracking-[0] text-white">
            {t("Select a network")}
          </h1>
          <IconButton onClick={onDismiss}>
            <XIcon />
          </IconButton>
        </div>

        <div className="grow overflow-hidden px-10 pb-10">
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
    </Modal>
  )
}
