import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Chain } from "@talismn/chaindata-provider"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { MetadataQrCode } from "@ui/domains/Sign/Qr/MetadataQrCode"
import { NetworkSpecsQrCode } from "@ui/domains/Sign/Qr/NetworkSpecsQrCode"
import useChains from "@ui/hooks/useChains"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button, Dropdown } from "talisman-ui"

import { DashboardLayout } from "../../layout/DashboardLayout"

const renderOption = (chain: Chain) => {
  return (
    <div className="flex max-w-full items-center gap-5 overflow-hidden">
      <ChainLogo id={chain.id} className="text-[1.25em]" />
      <span className="overflow-hidden text-ellipsis whitespace-nowrap">{chain.name}</span>
    </div>
  )
}

type Tab = "specs" | "metadata"

export const QrMetadataPage = () => {
  const { t } = useTranslation("admin")
  const { chains } = useChains(true)
  const [chain, setChain] = useState<Chain | null>(null)
  const [tab, setTab] = useState<"specs" | "metadata">("specs")

  const chainsWithRpcs = useMemo(
    () =>
      chains
        .filter((c) => c.rpcs?.length)
        .sort((c1, c2) => c1.name?.localeCompare(c2.name ?? "") ?? 0),
    [chains]
  )

  const handleSetTab = useCallback(
    (tab: Tab) => () => {
      setTab(tab)
    },
    []
  )

  return (
    <DashboardLayout centered>
      <HeaderBlock
        title={t("Polkadot Vault Metadata")}
        text={t("Register networks on your Polkadot Vault device, or update their metadata.")}
      />
      <div className="my-12 flex w-full flex-col gap-8">
        <Dropdown
          propertyKey="id"
          items={chainsWithRpcs}
          value={chain}
          placeholder={t("Select a network")}
          renderItem={renderOption}
          onChange={setChain}
        />
        {chain?.genesisHash && (
          <div className="flex flex-col items-center gap-16">
            <div className="mt-16 flex gap-12">
              <Button small primary={tab === "specs"} onClick={handleSetTab("specs")}>
                {t("Network Specs")}
              </Button>
              <Button small primary={tab === "metadata"} onClick={handleSetTab("metadata")}>
                {t("Network Metadata")}
              </Button>
            </div>
            <div className="flex aspect-square h-[40rem] w-[40rem] justify-center rounded-xl bg-white p-12">
              {tab === "specs" && (
                <NetworkSpecsQrCode genesisHash={chain.genesisHash} qrCodeSource="talisman" />
              )}
              {tab === "metadata" && (
                <MetadataQrCode genesisHash={chain.genesisHash} qrCodeSource="talisman" />
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
