import { TokenId } from "@core/domains/tokens/types"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import { useCallback, useEffect, useState } from "react"

import { TokenPicker } from "../Asset/TokenPicker"

export const SendFundsTokenPicker = () => {
  const { from, tokenId, to, set } = useSendFundsWizard()

  const [networkType, setNetworkType] = useState<"polkadot" | "ethereum">()
  const handleTokenSelect = useCallback(
    (tokenId: TokenId) => {
      set("tokenId", tokenId, true)
    },
    [set]
  )

  useEffect(() => {
    if (to && !from) setNetworkType(isEthereumAddress(to) ? "ethereum" : "polkadot")
  }, [to, from])

  return (
    <TokenPicker
      onSelect={handleTokenSelect}
      address={from}
      selected={tokenId}
      networkType={networkType}
    />
  )
}
