import { ArrowDownIcon, CreditCardIcon } from "@talismn/icons"
import { FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { PillButton } from "talisman-ui"

import { Balances } from "@extension/core"
import { FadeIn } from "@talisman/components/FadeIn"
import { useBuyTokensModal } from "@ui/domains/Asset/Buy/hooks/useBuyTokensModal"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useFeatureFlag } from "@ui/state"

import { PopupTokenBalances } from "./PopupTokenBalances"
import { useAssetDetails } from "./useAssetDetails"

const NoTokens = ({ symbol }: { symbol: string }) => {
  const { t } = useTranslation()
  const { selectedAccount, selectedFolder } = usePortfolioNavigation()
  const { open } = useCopyAddressModal()
  const { genericEvent } = useAnalytics()
  const { open: openBuyTokensModal } = useBuyTokensModal()

  const handleCopy = useCallback(() => {
    open({
      address: selectedAccount?.address,
      qr: true,
    })
    genericEvent("open receive", { from: "asset details" })
  }, [selectedAccount?.address, genericEvent, open])

  const showBuyCrypto = useFeatureFlag("BUY_CRYPTO")
  const handleBuyCryptoClick = useCallback(async () => {
    openBuyTokensModal()
  }, [openBuyTokensModal])

  return (
    <FadeIn>
      <div className="bg-field text-body-secondary leading-base rounded-sm p-10 text-center text-sm">
        <div>
          {selectedAccount
            ? t("You don't have any {{symbol}} in this account", { symbol })
            : selectedFolder
              ? t("You don't have any {{symbol}} in this folder", { symbol })
              : t("You don't have any {{symbol}}", { symbol })}
        </div>
        <div className="mt-6 flex justify-center gap-4">
          <PillButton icon={ArrowDownIcon} onClick={handleCopy}>
            {t("Copy address")}
          </PillButton>
          {showBuyCrypto && (
            <PillButton icon={CreditCardIcon} onClick={handleBuyCryptoClick}>
              {t("Buy Crypto")}
            </PillButton>
          )}
        </div>
      </div>
    </FadeIn>
  )
}

export const PopupAssetDetails: FC<{
  balances: Balances
  symbol: string
}> = ({ balances, symbol }) => {
  const { balancesByToken: rows } = useAssetDetails(balances)
  const hasBalance = useMemo(
    () => rows.some(([, balances]) => balances.each.some((b) => b.total.planck > 0n)),
    [rows],
  )

  if (!hasBalance) return <NoTokens symbol={symbol} />

  return (
    <FadeIn>
      <div className="flex flex-col gap-8">
        {rows.map(([tokenId, bal]) => (
          <PopupTokenBalances key={tokenId} tokenId={tokenId} balances={bal} />
        ))}
      </div>
    </FadeIn>
  )
}
