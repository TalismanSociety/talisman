import { DotNetworkId } from "@talismn/chaindata-provider"
import { InfoIcon } from "@talismn/icons"
import { log } from "extension-shared"
import { FC, useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button, Drawer } from "talisman-ui"

import { shortenAddress } from "@talisman/util/shortenAddress"
import { useNetworkById, useRemoteConfig } from "@ui/state"

import { NetworkLogo } from "../Networks/NetworkLogo"

// should only be used here and in CopyAddressChainForm
export type ChainFormat = {
  key: string
  chainId: DotNetworkId | null
  prefix: number | null
  oldPrefix?: number
  name: string
  address: string
  oldAddress?: string
}

export type MigratedChainFormat = {
  key: string
  chainId: DotNetworkId
  prefix: number
  oldPrefix: number
  name: string
  address: string
  oldAddress: string
}

export const isMigratedFormat = (format: ChainFormat): format is MigratedChainFormat => {
  const { prefix, oldPrefix } = format
  return typeof oldPrefix === "number" && typeof prefix === "number" && oldPrefix !== prefix
}

export const CopyAddressFormatPickerDrawer: FC<{
  format?: MigratedChainFormat
  onDismiss: () => void
  onSelect: (legacyFormat: boolean) => void
}> = ({ format, onDismiss, onSelect }) => {
  // keep a copy here to be able to keep rendering content while drawer is closing
  const [data, setData] = useState<MigratedChainFormat>()

  useEffect(() => {
    if (format) setData(format)
  }, [format])

  return (
    <Drawer
      containerId="copy-address-modal"
      isOpen={!!format}
      anchor="bottom"
      onDismiss={onDismiss}
    >
      {!!data && <DrawerContent format={data} onSelect={onSelect} />}
    </Drawer>
  )
}

const DrawerContent: FC<{
  format: MigratedChainFormat
  onSelect: (legacyFormat: boolean) => void
}> = ({ format, onSelect }) => {
  const { t } = useTranslation()
  const chain = useNetworkById(format.chainId, "polkadot")

  const handleSelect = useCallback(
    (legacyFormat: boolean) => () => {
      onSelect(legacyFormat)
    },
    [onSelect],
  )

  return (
    <div className="bg-grey-800 flex w-full flex-col items-center gap-6 rounded-t-xl p-12">
      <div className="text-md text-body font-bold">{t("Select Address Format")}</div>
      <div className="text-body-secondary text-center text-sm">
        {t("Legacy format may be needed when sending from some exchanges.")} <LearnMore />
      </div>
      <div></div>
      <FormatRow
        chainId={format.chainId}
        chainName={chain?.name ?? t("Unknown network")}
        address={format.address}
        label={t("New format")}
        onSelect={handleSelect(false)}
      />
      <FormatRow
        chainId={format.chainId}
        chainName={chain?.name ?? t("Unknown network")}
        address={format.oldAddress}
        label={t("Legacy format")}
        onSelect={handleSelect(true)}
      />
    </div>
  )
}

const LearnMore = () => {
  const { t } = useTranslation()
  const remoteConfig = useRemoteConfig()

  const handleClick = useCallback(() => {
    try {
      window.open(
        remoteConfig.documentation.unifiedAddressDocsUrl,
        "_blank",
        "nooppener noreferrer",
      )
    } catch (err) {
      log.error("Unable to open unified address docs", { cause: err })
    }
  }, [remoteConfig.documentation.unifiedAddressDocsUrl])

  return (
    <button
      type="button"
      className="text-body bg-grey-750 hover:bg-grey-700 inline-flex h-10 items-center gap-2 rounded-full px-3 text-xs"
      onClick={handleClick}
    >
      <InfoIcon />
      <span>{t("Learn more")}</span>
    </button>
  )
}

const FormatRow: FC<{
  chainId: DotNetworkId
  chainName: string
  address: string
  label: string
  onSelect: () => void
}> = ({ chainId, chainName, address, label, onSelect }) => {
  const { t } = useTranslation()

  return (
    <div className="border-grey-700 flex h-[6.8rem] w-full items-center gap-6 rounded-lg border px-8">
      <div className="size-16 shrink-0">
        <NetworkLogo networkId={chainId} className="shrink-0 text-xl" />
      </div>
      <div className="flex grow flex-col gap-2 overflow-hidden">
        <div className="flex items-center gap-4 overflow-hidden">
          <div className="text-body truncate text-sm">{chainName}</div>
          <div className="text-body-inactive text-tiny rounded-xs border-body-inactive shrink-0 border px-2 py-1">
            {label}
          </div>
        </div>
        <div className="text-body-secondary text-xs">{shortenAddress(address, 8, 8)}</div>
      </div>
      <Button primary small onClick={onSelect}>
        {t("Select")}
      </Button>
    </div>
  )
}
