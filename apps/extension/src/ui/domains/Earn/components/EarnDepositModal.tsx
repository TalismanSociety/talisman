import { Modal } from "@ui/components/Modal"
import { ModalDialog } from "@ui/components/ModalDialog"
import { PopupSizeModalContainer } from "@ui/components/PopupSizeModalContainer"
import { useToken } from "@ui/state/chaindata"
import { type FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useEarnDepositModal } from "../hooks/useEarnDepositModal"
import { useEarnSystemActionOpeners } from "../systems/registry"
import type { EarnOpportunity } from "../types"
import { EarnOpportunityPicker } from "./EarnOpportunityPicker"

export const EarnDepositModal: FC = () => {
  const { t } = useTranslation()
  const { isOpen, close, args } = useEarnDepositModal()
  const token = useToken(args?.tokenId)
  const openers = useEarnSystemActionOpeners()

  const openOpportunity = useCallback(
    (opportunity: EarnOpportunity) => {
      close()
      openers[opportunity.system](opportunity, {
        tokenId: args?.tokenId,
        discoverOnly: args?.discoverOnly,
      })
    },
    [args?.discoverOnly, args?.tokenId, close, openers]
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
        <ModalDialog
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
        </ModalDialog>
      </PopupSizeModalContainer>
    </Modal>
  )
}
