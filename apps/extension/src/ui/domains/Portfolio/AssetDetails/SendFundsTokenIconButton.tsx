import { TokenId } from "@talismn/chaindata-provider"
import { SendIcon } from "@talismn/icons"
import { useCallback } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { useSendFundsPopup } from "@ui/hooks/useSendFundsPopup"
import { useTokensMap } from "@ui/state"
import { isTransferableToken } from "@ui/util/isTransferableToken"

import { usePortfolioNavigation } from "../usePortfolioNavigation"

export const SendFundsTokenButton = ({
  tokenId,
  shouldClose,
}: {
  tokenId: TokenId
  shouldClose?: boolean
}) => {
  const { selectedAccount } = usePortfolioNavigation()
  const tokensMap = useTokensMap({ activeOnly: true, includeTestnets: true })
  const token = isTransferableToken(tokensMap[tokenId]) ? tokensMap[tokenId] : undefined

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
