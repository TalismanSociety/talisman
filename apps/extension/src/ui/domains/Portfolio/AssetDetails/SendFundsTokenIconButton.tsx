import type { TokenId } from "@talismn/chaindata-provider"
import { SendIcon } from "@talismn/icons"
import { useSendFundsPopup } from "@ui/hooks/useSendFundsPopup"
import { useToken } from "@ui/state/chaindata"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/talisman-ui/components/Tooltip"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"

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
    token?.id
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
        <TooltipTrigger className="inline-flex h-9 w-9 cursor-default items-center justify-center rounded-xs text-body-secondary text-xs opacity-50 hover:bg-grey-700 focus:text-body">
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
          className="inline-flex h-9 w-9 items-center justify-center rounded-xs text-body-secondary text-xs hover:bg-grey-700 hover:text-body focus:bg-grey-700 focus:text-body"
        >
          <SendIcon />
        </button>
      </TooltipTrigger>
      <TooltipContent>{t("Send")}</TooltipContent>
    </Tooltip>
  )
}
