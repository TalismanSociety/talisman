import {
  networkIdForAnalytics,
  tokenIdForAnalytics,
  tokenSymbolForAnalytics,
} from "@common/analytics/funds"
import {
  isTokenDot,
  isTokenEth,
  isTokenSol,
  type Token,
  type TokenId,
} from "@talismn/chaindata-provider"
import { detectAddressEncoding } from "@talismn/crypto"
import { track } from "@ui/api/track"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import { useNetworksMapById, useTokensMap } from "@ui/state/chaindata"
import { useCallback, useMemo } from "react"

import { type TokenPick, TokenPicker } from "../Asset/TokenPicker"

export const SendFundsTokenPicker = () => {
  const { from, to, tokenId, tokenSymbol, set } = useSendFundsWizard()
  const tokensMap = useTokensMap()
  const networksMap = useNetworksMapById()

  const handleTokenSelect = useCallback(
    (tokenId: TokenId, pick: TokenPick) => {
      const token = tokensMap[tokenId]
      track("send_token_selected", {
        searched: pick.searched,
        network_filtered: pick.networkFiltered,
        position: pick.position,
        token_id: tokenIdForAnalytics(token),
        symbol: tokenSymbolForAnalytics(token),
        network_id: networkIdForAnalytics(token && networksMap[token.networkId]),
      })
      set("tokenId", tokenId, true)
    },
    [set, tokensMap, networksMap]
  )

  const tokenFilter = useMemo<((token: Token) => boolean) | undefined>(() => {
    // in case the wizard is launched from the address book screen, by clicking a contact's "send to" link, tokens must be filtered by that contact address type
    // other cases are handled by the picker directly
    return !from && to && !tokenId ? getTokenFilter(to) : undefined
  }, [from, to, tokenId])

  return (
    <TokenPicker
      address={from}
      initialSearch={tokenSymbol}
      selected={tokenId}
      networkFilterContainerId="main"
      hideSameNetworkMirrors
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
