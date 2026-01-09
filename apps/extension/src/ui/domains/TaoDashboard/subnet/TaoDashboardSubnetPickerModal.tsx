import { FC, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Modal, WizardModalDialog } from "talisman-ui"

import { PopupSizeModalContainer } from "@talisman/components/PopupSizeModalContainer"
import { createGlobalOpenClose } from "@talisman/hooks/createGlobalOpenClose"
import { useCombinedSubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/useCombinedSubnetData"
import { useNavigateWithQuery } from "@ui/hooks/useNavigateWithQuery"

import { BITTENSOR_NETWORK_ID } from "../constants"
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

  // preload data used by the subnet picker modal to avoid flickering on mount
  useCombinedSubnetData(BITTENSOR_NETWORK_ID)

  const handleSelect = useCallback(
    (netuid: number) => {
      navigate(`/bittensor/subnets/${netuid}`)
      close()
    },
    [navigate, close],
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
          <SubnetPicker
            networkId={BITTENSOR_NETWORK_ID}
            selected={args?.netuid}
            onSelect={handleSelect}
          />
        </WizardModalDialog>
      </PopupSizeModalContainer>
    </Modal>
  )
}
