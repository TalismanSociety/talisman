import { Token, TokenId } from "@talismn/chaindata-provider"
import { isEthereumAddress, isValidSubstrateAddress } from "@talismn/util"
import { useCallback, useMemo } from "react"

import { isEvmToken } from "@extension/core/util/isEvmToken"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import { isSubToken } from "@ui/util/isSubToken"

import { TokenPicker } from "../Asset/TokenPicker"

export const SendFundsTokenPicker = () => {
  const { from, to, tokenId, tokenSymbol, set } = useSendFundsWizard()

  const handleTokenSelect = useCallback(
    (tokenId: TokenId) => {
      set("tokenId", tokenId, true)
    },
    [set],
  )

  const tokenFilter = useMemo<((token: Token) => boolean) | undefined>(() => {
    // in case the wizard is launched from the address book screen, by clicking a contact's "send to" link, tokens must be filtered by that contact address type
    // other cases are handled by the picker directly
    return !from && to && !tokenId ? getTokenFilter(to) : undefined
  }, [from, to, tokenId])

  return (
    <TokenPicker
      ownedOnly
      address={from}
      initialSearch={tokenSymbol}
      selected={tokenId}
      onSelect={handleTokenSelect}
      tokenFilter={tokenFilter}
    />
  )
}

const getTokenFilter = (address: string) => {
  if (isEthereumAddress(address)) return isEvmToken
  else if (isValidSubstrateAddress(address)) return isSubToken
  throw new Error("Unknown address type")
}
