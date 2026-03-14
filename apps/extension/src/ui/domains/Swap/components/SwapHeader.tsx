import { ChevronLeftIcon, XIcon } from "@talismn/icons"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useSwapTokensModal } from "../hooks/useSwapTokensModal"
import { useSwap } from "../SwapProvider"

export const SwapHeader = () => {
  const { t } = useTranslation()
  const { close: closeSwapTokensModal } = useSwapTokensModal()

  const { swapView, setSwapView, resetForm } = useSwap()

  const title = useMemo(() => {
    if (swapView === "confirm") return t("Confirm")
    if (swapView === "submitted") return null
    return t("Multi-chain Swap")
  }, [swapView, t])

  const onBack = useMemo(
    () =>
      ["form", "approve-recipient"].includes(swapView)
        ? closeSwapTokensModal
        : swapView === "submitted"
          ? undefined
          : () => void setSwapView("form"),
    [closeSwapTokensModal, setSwapView, swapView]
  )

  const onClose = useMemo(
    () =>
      ["form", "approve-recipient"].includes(swapView)
        ? closeSwapTokensModal
        : swapView === "submitted"
          ? () => {
              resetForm()
              closeSwapTokensModal()
            }
          : undefined,
    [closeSwapTokensModal, resetForm, swapView]
  )

  // Hide header entirely in submitted view — SwapProgress has its own layout
  if (swapView === "submitted") return null

  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        {onBack && !["form", "approve-recipient"].includes(swapView) && (
          <button type="button" className="px-12 py-10" onClick={onBack}>
            <ChevronLeftIcon className="shrink-0 text-body-secondary text-lg hover:text-white" />
          </button>
        )}
      </div>

      <h3 className="text-base text-body-secondary">{title}</h3>

      <div className="flex flex-1 justify-end">
        {onClose && (
          <button type="button" className="px-12 py-10" onClick={onClose}>
            <XIcon className="shrink-0 text-body-secondary text-lg hover:text-white" />
          </button>
        )}
      </div>
    </div>
  )
}
