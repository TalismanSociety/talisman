import { ChevronLeftIcon, XIcon } from "@talismn/icons"
import { useAtom } from "jotai"
import { useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useSwapTokensModal } from "../hooks/useSwapTokensModal"
import { swapViewAtom } from "../swaps-port/swapViewAtom"

export const SwapHeader = () => {
  const { t } = useTranslation()
  const { isOpen, close: closeSwapTokensModal } = useSwapTokensModal()

  const [swapView, setSwapView] = useAtom(swapViewAtom)
  useEffect(() => {
    isOpen && setSwapView("form")
  }, [isOpen, setSwapView])
  const title = useMemo(() => {
    if (swapView === "approve-erc20") return t("Approve")
    if (swapView === "confirm") return t("Confirm")
    return t("Swap")
  }, [swapView, t])

  const onBack = useMemo(
    () =>
      ["form", "approve-recipient"].includes(swapView)
        ? closeSwapTokensModal
        : () => void setSwapView("form"),
    [closeSwapTokensModal, setSwapView, swapView],
  )

  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        {!["form", "approve-recipient"].includes(swapView) && (
          <button className="px-12 py-10" onClick={onBack}>
            <ChevronLeftIcon className="text-body-secondary shrink-0 text-lg hover:text-white" />
          </button>
        )}
      </div>

      <h3 className="text-body-secondary text-base">{title}</h3>

      <div className="flex flex-1 justify-end">
        {["form", "approve-recipient"].includes(swapView) && (
          <button className="px-12 py-10" onClick={onBack}>
            <XIcon className="text-body-secondary shrink-0 text-lg hover:text-white" />
          </button>
        )}
      </div>
    </div>
  )
}
