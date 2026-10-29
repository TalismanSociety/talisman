import { ModalDialog } from "@ui/components/ModalDialog"
import { useToken } from "@ui/state/chaindata"
import { useTranslation } from "react-i18next"
import { useSwapModal } from "../hooks/useSwapModal"
import { useSwap } from "../SwapProvider"
import { SwapConfirmActions } from "./SwapConfirmActions"
import { SwapTxSummary } from "./SwapTxSummary"

export const SWAP_CONFIRM_CONTAINER_ID = "swap-modal-confirm"

export const SwapConfirm = () => {
  const { t } = useTranslation()
  const { close } = useSwapModal()

  const {
    fromTokenId,
    toTokenId,
    fromAmount,
    toAmount,
    fromAddress,
    toAddress,
    setSwapView,
    setApprovalHash,
  } = useSwap()
  const fromToken = useToken(fromTokenId)
  const toToken = useToken(toTokenId)

  if (
    !fromToken ||
    !toToken ||
    !fromAddress ||
    !toAddress ||
    typeof fromAmount !== "bigint" ||
    typeof toAmount !== "bigint"
  )
    return null

  const goBack = () => {
    setApprovalHash(null)
    setSwapView("form")
  }

  return (
    <ModalDialog
      variant="wizard"
      className="size-full border-none"
      title={t("Confirm")}
      onBackClick={goBack}
      onCloseClick={close}
      contentClassName="relative flex flex-col overflow-hidden! p-0!"
      id={SWAP_CONFIRM_CONTAINER_ID}
    >
      <SwapConfirmActions containerId={SWAP_CONFIRM_CONTAINER_ID}>
        <SwapTxSummary
          fromTokenId={fromToken.id}
          toTokenId={toToken.id}
          fromAmount={fromAmount}
          toAmount={toAmount}
          fromAddress={fromAddress}
          toAddress={toAddress}
        />
      </SwapConfirmActions>
    </ModalDialog>
  )
}
