import { POLKADOT_VAULT_DOCS_URL } from "@core/constants"
import { FadeIn } from "@talisman/components/FadeIn"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Chain } from "@talismn/chaindata-provider"
import { SeedIcon } from "@talismn/icons"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { MetadataQrCode } from "@ui/domains/Sign/Qr/MetadataQrCode"
import { NetworkSpecsQrCode } from "@ui/domains/Sign/Qr/NetworkSpecsQrCode"
import { useAppState } from "@ui/hooks/useAppState"
import useChains from "@ui/hooks/useChains"
import { useMnemonic } from "@ui/hooks/useMnemonics"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
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

const MnemonicButton: FC<{ label: string }> = ({ label }) => {
  const navigate = useNavigate()

  const handleClick = useCallback(() => {
    navigate("/settings/mnemonics")
  }, [navigate])

  return (
    <button
      type="button"
      onClick={handleClick}
      className="bg-grey-800 hover:bg-grey-700 hover:text-grey-200 inline-flex max-w-full items-center gap-2 overflow-hidden rounded px-3 py-1 pb-1"
    >
      <SeedIcon className="shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  )
}

export const QrMetadataPage = () => {
  const { t } = useTranslation("admin")
  const { chains } = useChains(true)
  const [chain, setChain] = useState<Chain | null>(null)
  const [tab, setTab] = useState<"specs" | "metadata">("specs")

  const [certifierMnemonicId] = useAppState("vaultVerifierCertificateMnemonicId")
  const mnemonic = useMnemonic(certifierMnemonicId)

  useEffect(() => {
    // when chain change reset to network specs tab
    setTab("specs")
  }, [chain])

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

      <div className="text-body-secondary my-12 flex w-full flex-col gap-8">
        <Dropdown
          propertyKey="id"
          items={chainsWithRpcs}
          value={chain}
          placeholder={t("Select a network")}
          renderItem={renderOption}
          onChange={setChain}
        />

        {chain?.genesisHash && (
          <>
            <p className=" mt-4">
              <Trans
                t={t}
                components={{
                  LineBreak: <br />,
                  Link: (
                    // eslint-disable-next-line jsx-a11y/anchor-has-content
                    <a
                      href={POLKADOT_VAULT_DOCS_URL}
                      target="_blank"
                      className="hover:text-grey-200 text-grey-300"
                    ></a>
                  ),
                }}
                defaults="Talisman's QR codes are generated from live network data and signed with the recovery phrase that you've chosen as Polkadot Vault Verifier Certificate. <Link>Learn more</Link"
              />
            </p>
            <p className="flex items-center gap-3">
              <span className="whitespace-nowrap">
                {t("Your Verifier Certificate recovery phrase is")}
              </span>
              <MnemonicButton label={mnemonic?.name ?? "Unknown"} />
            </p>
            <FadeIn key={chain.genesisHash} className="flex flex-col items-center gap-16">
              <div className="mt-12 flex gap-12">
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
            </FadeIn>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
