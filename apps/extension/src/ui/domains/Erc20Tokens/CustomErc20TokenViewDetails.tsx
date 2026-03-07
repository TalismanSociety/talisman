import type { EthNetwork, EvmErc20Token } from "@talismn/chaindata-provider"
import { Button } from "@ui/components/Button"
import { Drawer } from "@ui/components/Drawer"
import { PillButton } from "@ui/components/PillButton"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { useTranslation } from "react-i18next"

import { ViewDetailsAddress } from "../Sign/ViewDetails/ViewDetailsAddress"
import { ViewDetailsField } from "../Sign/ViewDetails/ViewDetailsField"

type CustomErc20TokenViewDetailsProps = {
  token: EvmErc20Token
  network: EthNetwork
}

export const CustomErc20TokenViewDetails = ({
  token,
  network,
}: CustomErc20TokenViewDetailsProps) => {
  const { t } = useTranslation()
  const { isOpen, open, close } = useOpenClose()

  return (
    <>
      <PillButton onClick={open}>{t("View Details")}</PillButton>
      <Drawer containerId="main" isOpen={isOpen} onDismiss={close} anchor="bottom">
        <div className="flex max-h-full flex-col rounded-t-xl bg-grey-800 p-12 text-body-secondary text-sm">
          <h3 className="text-sm">{t("Token Details")}</h3>
          <div className="scrollable scrollable-700 overflow-y-auto text-body leading-paragraph">
            <ViewDetailsField label={t("Network")}>{network.name}</ViewDetailsField>
            <ViewDetailsField label={t("Symbol")}>{token.symbol}</ViewDetailsField>
            <ViewDetailsField label={t("Decimals")}>{token.decimals}</ViewDetailsField>
            <ViewDetailsAddress
              label={t("Contract")}
              address={token.contractAddress}
              network={network}
            />
          </div>
          <Button className="mt-12" onClick={close}>
            {t("Close")}
          </Button>
        </div>
      </Drawer>
    </>
  )
}
