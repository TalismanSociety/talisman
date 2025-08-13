import { isTokenDot, isTokenEth, isTokenSol, Token, TokenId } from "@talismn/chaindata-provider"
import { detectAddressEncoding } from "@talismn/crypto"
import { useCallback, useMemo } from "react"

import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"

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
  const accountEncoding = detectAddressEncoding(address)
  switch (accountEncoding) {
    case "ss58":
      return isTokenDot
    case "ethereum":
      return isTokenEth
    case "base58solana":
      return isTokenSol
    default:
      throw new Error(`Unsupported address encoding: ${accountEncoding}`)
  }
}
