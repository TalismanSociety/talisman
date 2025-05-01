import { CopyIcon, CreditCardIcon } from "@talismn/icons"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { PillButton } from "talisman-ui"

import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useFeatureFlag } from "@ui/state"

import { useCopyAddressModal } from "../CopyAddress"
import { useRampsModal } from "../Ramps/useRampsModal"
import { usePortfolioNavigation } from "./usePortfolioNavigation"

type NoTokensMessageProps = {
  symbol: string
}

export const NoTokensMessage = ({ symbol }: NoTokensMessageProps) => {
  const { t } = useTranslation()
  const { genericEvent } = useAnalytics()
  const { selectedAccount, selectedFolder } = usePortfolioNavigation()
  const { open } = useCopyAddressModal()

  const handleCopy = useCallback(() => {
    open({ address: selectedAccount?.address, qr: true })
    genericEvent("open receive", { from: "NoTokensMessage" })
  }, [selectedAccount?.address, genericEvent, open])

  const showBuyCrypto = useFeatureFlag("BUY_CRYPTO")
  const { open: openRampsModal } = useRampsModal()
  const handleBuyCryptoClick = useCallback(() => {
    genericEvent("open ramps", { from: "NoTokensMessage" })
    openRampsModal()
  }, [genericEvent, openRampsModal])

  return (
    <div className="bg-field text-body-secondary flex flex-col items-center justify-center rounded py-36">
      <div>
        {selectedAccount
          ? t("You don't have any {{symbol}} in this account", { symbol })
          : selectedFolder
            ? t("You don't have any {{symbol}} in this folder", { symbol })
            : t("You don't have any {{symbol}} in Talisman", { symbol })}
      </div>
      <div className="mt-12 flex justify-center gap-4">
        <PillButton size="sm" icon={CopyIcon} onClick={handleCopy}>
          {t("Copy Address")}
        </PillButton>
        {showBuyCrypto && (
          <PillButton size="sm" icon={CreditCardIcon} onClick={handleBuyCryptoClick}>
            {t("Buy Crypto")}
          </PillButton>
        )}
      </div>
    </div>
  )
}
