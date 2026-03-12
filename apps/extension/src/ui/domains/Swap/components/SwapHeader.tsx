import { ChevronLeftIcon, XIcon } from "@talismn/icons"
import { useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useSwapTokensModal } from "../hooks/useSwapTokensModal"
import { useSwap } from "../SwapProvider"

export const SwapHeader = () => {
  const { t } = useTranslation()
  const { isOpen, close: closeSwapTokensModal } = useSwapTokensModal()

  const { swapView, setSwapView } = useSwap()
  useEffect(() => {
    isOpen && setSwapView("form")
  }, [isOpen, setSwapView])
  const title = useMemo(() => {
    if (swapView === "confirm") return t("Confirm")
    return t("Swap")
  }, [swapView, t])

  const onBack = useMemo(
    () =>
      ["form", "approve-recipient"].includes(swapView)
        ? closeSwapTokensModal
        : () => void setSwapView("form"),
    [closeSwapTokensModal, setSwapView, swapView]
  )

  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        {!["form", "approve-recipient"].includes(swapView) && (
          <button type="button" className="px-12 py-10" onClick={onBack}>
            <ChevronLeftIcon className="shrink-0 text-body-secondary text-lg hover:text-white" />
          </button>
        )}
      </div>

      <h3 className="text-base text-body-secondary">{title}</h3>

      <div className="flex flex-1 justify-end">
        {["form", "approve-recipient"].includes(swapView) && (
          <button type="button" className="px-12 py-10" onClick={onBack}>
            <XIcon className="shrink-0 text-body-secondary text-lg hover:text-white" />
          </button>
        )}
      </div>
    </div>
  )
}
