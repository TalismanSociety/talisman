import { CustomEvmNetwork, EvmNetwork } from "@extension/core"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { CustomEvmErc20Token } from "@talismn/balances"
import { useTranslation } from "react-i18next"
import { Button, Drawer, PillButton } from "talisman-ui"

import { ViewDetailsAddress } from "../Sign/ViewDetails/ViewDetailsAddress"
import { ViewDetailsField } from "../Sign/ViewDetails/ViewDetailsField"

type CustomErc20TokenViewDetailsProps = {
  token: CustomEvmErc20Token
  network: EvmNetwork | CustomEvmNetwork
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
        <div className="bg-grey-800 text-body-secondary flex max-h-full flex-col rounded-t-xl p-12 text-sm">
          <h3 className="text-sm">{t("Token Details")}</h3>
          <div className="scrollable scrollable-700 text-body leading-paragraph overflow-y-auto">
            <ViewDetailsField label={t("Network")}>{network.name}</ViewDetailsField>
            <ViewDetailsField label={t("Symbol")}>{token.symbol}</ViewDetailsField>
            <ViewDetailsField label={t("Decimals")}>{token.decimals}</ViewDetailsField>
            <ViewDetailsAddress
              label={t("Contract")}
              address={token.contractAddress}
              blockExplorerUrl={network.explorerUrl}
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
