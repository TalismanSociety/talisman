import { Modal } from "@ui/components/Modal"
import { PopupSizeModalContainer } from "@ui/components/PopupSizeModalContainer"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { useCombinedSubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/useCombinedSubnetData"
import { createGlobalOpenClose } from "@ui/hooks/createGlobalOpenClose"
import { useNavigateWithQuery } from "@ui/hooks/useNavigateWithQuery"
import { type FC, useCallback } from "react"
import { useTranslation } from "react-i18next"

import { useTaoDashboardNetworkId } from "../shared/TaoDashboardNetworkProvider"
import { getTaoDashboardUrl } from "../shared/util"
import { SubnetPicker } from "./TaoDashboardSubnetPicker"

type TaoDashboardSubnetPickerInitProps = {
  netuid?: number
}

export const [useTaoDashboardSubnetPickerModal] =
  createGlobalOpenClose<TaoDashboardSubnetPickerInitProps>()

export const TaoDashboardSubnetPickerModal: FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigateWithQuery()
  const { isOpen, close, args } = useTaoDashboardSubnetPickerModal()
  const networkId = useTaoDashboardNetworkId()

  // preload data used by the subnet picker modal to avoid flickering on mount
  useCombinedSubnetData(networkId)

  const handleSelect = useCallback(
    (netuid: number) => {
      navigate(getTaoDashboardUrl(networkId, netuid))
      close()
    },
    [navigate, networkId, close]
  )

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <PopupSizeModalContainer id="subnet-picker-modal">
        <WizardModalDialog
          className="size-full border-none"
          title={t("Select Subnet")}
          contentClassName="p-0"
          onCloseClick={close}
        >
          <SubnetPicker networkId={networkId} selected={args?.netuid} onSelect={handleSelect} />
        </WizardModalDialog>
      </PopupSizeModalContainer>
    </Modal>
  )
}
