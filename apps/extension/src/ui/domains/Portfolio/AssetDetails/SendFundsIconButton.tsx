import { ChainId, EvmNetworkId } from "@talismn/chaindata-provider"
import { SendIcon } from "@talismn/icons"
import { useCallback } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { useSendFundsPopup } from "@ui/hooks/useSendFundsPopup"
import { useSetting, useTokens } from "@ui/state"
import { isTransferableToken } from "@ui/util/isTransferableToken"

import { usePortfolioNavigation } from "../usePortfolioNavigation"

export const SendFundsButton = ({
  symbol,
  networkId,
  shouldClose,
}: {
  symbol: string
  networkId: ChainId | EvmNetworkId
  shouldClose?: boolean
}) => {
  const { selectedAccount } = usePortfolioNavigation()
  const [includeTestnets] = useSetting("useTestnets")
  const tokens = useTokens({ activeOnly: true, includeTestnets })

  const token = tokens?.find(
    (t) =>
      t.symbol === symbol &&
      isTransferableToken(t) &&
      (("evmNetwork" in t && t.evmNetwork?.id === networkId) || t.chain?.id === networkId),
  )

  const { canSendFunds, cannotSendFundsReason, openSendFundsPopup } = useSendFundsPopup(
    selectedAccount,
    token?.id,
  )

  const handleClick = useCallback(() => {
    if (!canSendFunds) return
    openSendFundsPopup()
    if (shouldClose) window.close()
  }, [canSendFunds, openSendFundsPopup, shouldClose])

  if (!token) return null

  if (!canSendFunds)
    return (
      <Tooltip>
        <TooltipTrigger className="text-body-secondary focus:text-body hover:bg-grey-700 inline-flex h-9 w-9 cursor-default items-center justify-center rounded-full text-xs opacity-50">
          <SendIcon />
        </TooltipTrigger>
        <TooltipContent>{cannotSendFundsReason}</TooltipContent>
      </Tooltip>
    )

  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-body-secondary hover:text-body focus:text-body focus:bg-grey-700 hover:bg-grey-700 inline-flex h-9 w-9 items-center justify-center rounded-full text-xs"
    >
      <SendIcon />
    </button>
  )
}
