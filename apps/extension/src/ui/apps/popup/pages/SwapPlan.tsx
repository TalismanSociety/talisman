import type { SwapPlanId } from "@core/domains/swaps/plans/types"
import { XIcon } from "@talismn/icons"
import { IconButton } from "@ui/components/IconButton"
import { SwapPlanTransactions } from "@ui/domains/Swap/components/SwapPlanTransactions"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"

import { PopupHeader, PopupLayout } from "../Layout/PopupLayout"

export const SwapPlanPage = () => {
  const { t } = useTranslation()
  const { id } = useParams<"id">()
  const navigate = useNavigate()
  const handleClose = useCallback(() => navigate("/portfolio"), [navigate])

  if (!id) return null

  return (
    <PopupLayout>
      <PopupHeader
        right={
          <IconButton onClick={handleClose}>
            <XIcon />
          </IconButton>
        }
      >
        {t("Swap")}
      </PopupHeader>
      <SwapPlanTransactions id={id as SwapPlanId} onClose={handleClose} />
    </PopupLayout>
  )
}
