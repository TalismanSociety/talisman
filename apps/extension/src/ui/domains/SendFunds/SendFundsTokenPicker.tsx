import { TokenId } from "@talismn/chaindata-provider"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import { useCallback } from "react"

import { TokenPicker } from "../Asset/TokenPicker"

export const SendFundsTokenPicker = () => {
  const { from, tokenId, tokenSymbol, set } = useSendFundsWizard()

  const handleTokenSelect = useCallback(
    (tokenId: TokenId) => {
      set("tokenId", tokenId, true)
    },
    [set]
  )

  return (
    <TokenPicker
      ownedOnly
      address={from}
      initialSearch={tokenSymbol}
      selected={tokenId}
      onSelect={handleTokenSelect}
    />
  )
}
