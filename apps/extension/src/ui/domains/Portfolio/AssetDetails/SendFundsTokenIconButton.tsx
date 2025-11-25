import { TokenId } from "@talismn/chaindata-provider"
import { SendIcon } from "@talismn/icons"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { useSendFundsPopup } from "@ui/hooks/useSendFundsPopup"
import { useToken } from "@ui/state"

import { usePortfolioNavigation } from "../usePortfolioNavigation"

export const SendFundsTokenButton = ({
  tokenId,
  shouldClose,
}: {
  tokenId: TokenId
  shouldClose?: boolean
}) => {
  const { t } = useTranslation()
  const { selectedAccount } = usePortfolioNavigation()
  const token = useToken(tokenId)

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
        <TooltipTrigger className="text-body-secondary focus:text-body hover:bg-grey-700 rounded-xs inline-flex h-9 w-9 cursor-default items-center justify-center text-xs opacity-50">
          <SendIcon />
        </TooltipTrigger>
        <TooltipContent>{cannotSendFundsReason}</TooltipContent>
      </Tooltip>
    )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleClick}
          className="text-body-secondary hover:text-body focus:text-body focus:bg-grey-700 hover:bg-grey-700 rounded-xs inline-flex h-9 w-9 items-center justify-center text-xs"
        >
          <SendIcon />
        </button>
      </TooltipTrigger>
      <TooltipContent>{t("Send")}</TooltipContent>
    </Tooltip>
  )
}
