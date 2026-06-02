import { Modal } from "@ui/components/Modal"
import { PopupSizeModalContainer } from "@ui/components/PopupSizeModalContainer"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { useSeekStakingModal } from "@ui/domains/Earn/seek/useSeekStakingModal"
import { useYieldxyzEnterModal } from "@ui/domains/Earn/yieldxyz/enter/useYieldxyzEnterModal"
import { useToken } from "@ui/state/chaindata"
import { type FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useEarnDepositModal } from "../hooks/useEarnDepositModal"
import type { YieldxyzEarnOpportunity } from "../hooks/useEarnOpportunitiesByTokenId"
import type { EarnOpportunity } from "../types"
import { EarnOpportunityPicker } from "./EarnOpportunityPicker"

export const EarnDepositModal: FC = () => {
  const { t } = useTranslation()
  const { isOpen, close, args } = useEarnDepositModal()
  const token = useToken(args?.tokenId)
  const yieldxyzModal = useYieldxyzEnterModal()
  const seekModal = useSeekStakingModal()

  const openOpportunity = useCallback(
    (opportunity: EarnOpportunity) => {
      close()
      if (opportunity.system === "yieldxyz")
        yieldxyzModal.open({
          pickerTokenId: args?.tokenId,
          discoverOnly: args?.discoverOnly,
          productId: (opportunity as YieldxyzEarnOpportunity).product.id,
        })
      else if (opportunity.system === "seek") seekModal.open({ action: "stake" })
    },
    [args?.discoverOnly, args?.tokenId, close, seekModal, yieldxyzModal]
  )

  const disabledReason = useMemo(
    () =>
      args?.discoverOnly
        ? t("You do not have any {{symbol}}", { symbol: token?.symbol ?? "" })
        : null,
    [args?.discoverOnly, token?.symbol, t]
  )

  return (
    <Modal containerId="main" isOpen={isOpen && !!args?.opportunities.length} onDismiss={close}>
      <PopupSizeModalContainer id="earn-provider-modal">
        <WizardModalDialog
          className="size-full border-none"
          title={t("Select Earn Opportunity")}
          contentClassName="p-0"
          onCloseClick={close}
        >
          <EarnOpportunityPicker
            opportunities={args?.opportunities ?? []}
            onSelect={openOpportunity}
            disabledReason={disabledReason}
          />
        </WizardModalDialog>
      </PopupSizeModalContainer>
    </Modal>
  )
}
