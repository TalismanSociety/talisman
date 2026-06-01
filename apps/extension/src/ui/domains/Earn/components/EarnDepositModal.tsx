import { ChevronRightIcon } from "@talismn/icons"
import { Modal } from "@ui/components/Modal"
import { PopupSizeModalContainer } from "@ui/components/PopupSizeModalContainer"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { useSeekStakingModal } from "@ui/domains/Earn/seek/useSeekStakingModal"
import { useYieldxyzEnterModal } from "@ui/domains/Earn/yieldxyz/enter/useYieldxyzEnterModal"
import { useToken } from "@ui/state/chaindata"
import { type FC, useCallback, useEffect } from "react"
import { useTranslation } from "react-i18next"

import { useEarnDepositModal } from "../hooks/useEarnDepositModal"
import type { EarnOpportunity } from "../types"

export const EarnDepositModal: FC = () => {
  const { t } = useTranslation()
  const { isOpen, close, args } = useEarnDepositModal()
  const token = useToken(args?.tokenId)
  const yieldxyzModal = useYieldxyzEnterModal()
  const seekModal = useSeekStakingModal()

  const openOpportunity = useCallback(
    (opportunity: EarnOpportunity) => {
      close()
      const productId = (opportunity as { product?: { id: string } }).product?.id
      if (opportunity.providerId === "yieldxyz" && productId)
        yieldxyzModal.open({
          pickerTokenId: args?.tokenId,
          discoverOnly: args?.discoverOnly,
          productId,
        })
      else if (opportunity.providerId === "seek") seekModal.open({ action: "stake" })
    },
    [args?.discoverOnly, args?.tokenId, close, seekModal, yieldxyzModal]
  )

  useEffect(() => {
    if (!isOpen || !args || args.opportunities.length !== 1) return
    openOpportunity(args.opportunities[0])
  }, [args, isOpen, openOpportunity])

  return (
    <Modal
      containerId="main"
      isOpen={isOpen && (args?.opportunities.length ?? 0) > 1}
      onDismiss={close}
    >
      <PopupSizeModalContainer id="earn-provider-modal">
        <div className="flex h-full flex-col overflow-hidden">
          <div className="flex h-28 shrink-0 items-center gap-4 px-8 font-bold text-lg">
            <TokenLogo tokenId={args?.tokenId ?? ""} className="size-12" />
            <div>{t("Choose an {{symbol}} opportunity", { symbol: token?.symbol ?? "" })}</div>
          </div>
          <div className="flex flex-col gap-4 overflow-y-auto p-8 pt-0">
            {args?.opportunities.map((opportunity) => (
              <button
                key={opportunity.id}
                type="button"
                className="flex h-24 items-center gap-4 rounded bg-grey-850 px-6 text-left hover:bg-grey-750"
                onClick={() => openOpportunity(opportunity)}
              >
                <div className="flex grow flex-col gap-1 overflow-hidden">
                  <div className="truncate font-bold text-body">{opportunity.title}</div>
                  <div className="truncate text-body-secondary text-sm">
                    {opportunity.providerName} · {opportunity.type}
                  </div>
                </div>
                <div className="shrink-0 font-bold text-primary text-sm">
                  {opportunity.apr == null
                    ? t("Variable")
                    : t("{{apr}}%", { apr: opportunity.apr.toFixed(2) })}
                </div>
                <ChevronRightIcon className="size-8 shrink-0 text-body-secondary" />
              </button>
            ))}
          </div>
        </div>
      </PopupSizeModalContainer>
    </Modal>
  )
}
