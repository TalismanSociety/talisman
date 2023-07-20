import { AddEthereumChainParameter } from "@core/domains/ethereum/types"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button, Drawer, PillButton } from "talisman-ui"

import { ViewDetailsField } from "../Sign/ViewDetails/ViewDetailsField"

export const NetworksDetailsButton: FC<{
  network: AddEthereumChainParameter
}> = ({ network }) => {
  const { t } = useTranslation("request")
  const { isOpen, open, close } = useOpenClose()

  const tryParseIntFromHex = useCallback(
    (value: string) => {
      try {
        return parseInt(value, 16)
      } catch (err) {
        return t("N/A")
      }
    },
    [t]
  )

  const { name, rpcs, chainId, tokenSymbol, blockExplorers } = useMemo(() => {
    return {
      name: network?.chainName || "N/A",
      rpcs: network?.rpcUrls?.join("\n") || "N/A",
      chainId: tryParseIntFromHex(network?.chainId),
      tokenSymbol: network?.nativeCurrency?.symbol || "N/A",
      blockExplorers: network?.blockExplorerUrls?.join("\n"),
    }
  }, [network, tryParseIntFromHex])

  return (
    <>
      <PillButton onClick={open}>{t("View Details")}</PillButton>
      <Drawer containerId="main" isOpen={isOpen} onDismiss={close} anchor="bottom">
        <div className="bg-grey-800 text-body-secondary flex max-h-full flex-col rounded-t-xl p-12 text-sm">
          <h3 className="text-sm">{t("Network Details")}</h3>
          <div className="scrollable scrollable-700 text-body leading-paragraph overflow-y-auto">
            <ViewDetailsField label={t("Network Name")}>{name}</ViewDetailsField>
            <ViewDetailsField label={t("RPC URL")}>{rpcs}</ViewDetailsField>
            <ViewDetailsField label={t("Chain ID")}>{chainId}</ViewDetailsField>
            <ViewDetailsField label={t("Currency Symbol")}>{tokenSymbol}</ViewDetailsField>
            <ViewDetailsField label={t("Block Explorer URL")}>{blockExplorers}</ViewDetailsField>
          </div>
          <Button className="mt-12" onClick={close}>
            {t("Close")}
          </Button>
        </div>
      </Drawer>
    </>
  )
}
