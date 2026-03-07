import { useOpenClose } from "@talisman/hooks/useOpenClose"
import type { Network } from "@talismn/chaindata-provider"
import { classNames } from "@talismn/util"
import { Button } from "@ui/components/Button"
import { Drawer } from "@ui/components/Drawer"
import { PillButton } from "@ui/components/PillButton"
import { type FC, type ReactNode, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { ViewDetailsField } from "../Sign/ViewDetails/ViewDetailsField"

const NetworkDetailsDrawer: FC<{
  network: Network
  isOpen: boolean
  onClose: () => void
  title?: ReactNode
}> = ({ network, isOpen, title, onClose }) => {
  const { t } = useTranslation()

  const { name, rpcs, chainId, tokenSymbol, blockExplorers } = useMemo(() => {
    return {
      name: network.name || "N/A",
      rpcs: network.rpcs?.join("\n") || "N/A",
      chainId: network.id,
      tokenSymbol: network.nativeCurrency?.symbol || "N/A",
      blockExplorers: network.blockExplorerUrls?.join("\n"),
    }
  }, [network])

  return (
    <Drawer containerId="main" isOpen={isOpen} onDismiss={onClose} anchor="bottom">
      <div className="flex max-h-full flex-col rounded-t-xl bg-grey-800 p-12 text-body-secondary text-sm">
        <h3 className="text-sm">{title ?? t("Network Details")}</h3>
        <div className="scrollable scrollable-700 overflow-y-auto text-body leading-paragraph">
          <ViewDetailsField label={t("Network Name")}>{name}</ViewDetailsField>
          <ViewDetailsField label={t("RPC URL")}>{rpcs}</ViewDetailsField>
          <ViewDetailsField label={t("Chain ID")}>{chainId}</ViewDetailsField>
          <ViewDetailsField label={t("Currency Symbol")}>{tokenSymbol}</ViewDetailsField>
          <ViewDetailsField label={t("Block Explorer URL")}>{blockExplorers}</ViewDetailsField>
        </div>
        <Button className="mt-12" onClick={onClose}>
          {t("Close")}
        </Button>
      </div>
    </Drawer>
  )
}

export const NetworkDetailsButton: FC<{
  network: Network
  label?: string
  className?: string
}> = ({ network, label, className }) => {
  const { t } = useTranslation()
  const { isOpen, open, close } = useOpenClose()

  return (
    <>
      <PillButton className={className} onClick={open}>
        {label ?? t("View Details")}
      </PillButton>
      <NetworkDetailsDrawer network={network} isOpen={isOpen} onClose={close} />
    </>
  )
}

export const NetworkDetailsLink: FC<{
  network: Network
  label?: string
  className?: string
  title?: ReactNode
}> = ({ network, label, className, title }) => {
  const { t } = useTranslation()
  const { isOpen, open, close } = useOpenClose()

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={classNames(
          "text-body-secondary underline ring-body hover:text-grey-300 focus-visible:ring-1 active:text-body",
          className
        )}
      >
        {label ?? t("View Details")}
      </button>
      <NetworkDetailsDrawer network={network} isOpen={isOpen} title={title} onClose={close} />
    </>
  )
}
