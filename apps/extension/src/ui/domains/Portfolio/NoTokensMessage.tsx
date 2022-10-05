import { CopyIcon, CreditCardIcon } from "@talisman/theme/icons"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { useIsFeatureEnabled } from "@ui/hooks/useFeatures"
import { useCallback } from "react"
import { PillButton } from "talisman-ui"

import { useAddressFormatterModal } from "../Account/AddressFormatterModal"
import { useBuyTokensModal } from "../Asset/Buy/BuyTokensModalContext"

type NoTokensMessageProps = {
  symbol: string
}

export const NoTokensMessage = ({ symbol }: NoTokensMessageProps) => {
  const { account } = useSelectedAccount()
  const { open } = useAddressFormatterModal()

  const handleCopy = useCallback(() => {
    if (!account?.address) return
    open(account.address)
  }, [account, open])

  const showBuyCrypto = useIsFeatureEnabled("BUY_CRYPTO")
  const { open: openBuyCrypto } = useBuyTokensModal()
  const handleBuyCryptoClick = useCallback(() => {
    openBuyCrypto()
  }, [openBuyCrypto])

  return (
    <div className="bg-field text-body-secondary flex flex-col items-center justify-center rounded py-36">
      <div>
        You don't have any {symbol} {account ? "in this account" : "in Talisman"}.
      </div>
      <div className="mt-12 flex justify-center gap-4">
        {account && (
          <PillButton size="sm" icon={CopyIcon} onClick={handleCopy}>
            Copy address
          </PillButton>
        )}
        {showBuyCrypto && (
          <PillButton size="sm" icon={CreditCardIcon} onClick={handleBuyCryptoClick}>
            Buy Crypto
          </PillButton>
        )}
      </div>
    </div>
  )
}
