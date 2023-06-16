import { TokenId } from "@core/domains/tokens/types"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import { useCallback } from "react"

import { TokenPicker } from "../Asset/TokenPicker"

export const SendFundsTokenPicker = () => {
  const { from, tokenId, set } = useSendFundsWizard()

  const handleTokenSelect = useCallback(
    (tokenId: TokenId) => {
      set("tokenId", tokenId, true)
    },
    [set]
  )

  return <TokenPicker ownedOnly address={from} selected={tokenId} onSelect={handleTokenSelect} />
}
