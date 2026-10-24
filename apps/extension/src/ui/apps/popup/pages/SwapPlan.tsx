import type { SwapPlanId } from "@core/domains/swaps/plans/types"
import { SwapPlanProgress } from "@ui/domains/Swap/components/SwapPlanProgress"
import { useCallback } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { PopupLayout } from "../Layout/PopupLayout"

export const SwapPlanPage = () => {
  const { id } = useParams<"id">()
  const navigate = useNavigate()
  const handleClose = useCallback(() => navigate("/portfolio"), [navigate])

  if (!id) return null

  return (
    <PopupLayout>
      <SwapPlanProgress id={id as SwapPlanId} onClose={handleClose} />
    </PopupLayout>
  )
}
