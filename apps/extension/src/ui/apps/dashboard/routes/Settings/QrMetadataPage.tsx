import { log } from "@extension/shared"
import { POLKADOT_VAULT_DOCS_URL } from "@extension/shared"
import { FadeIn } from "@talisman/components/FadeIn"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { notify } from "@talisman/components/Notifications"
import { Chain } from "@talismn/chaindata-provider"
import { LoaderIcon, SecretIcon } from "@talismn/icons"
import { api } from "@ui/api"
import {
  MnemonicCreateModal,
  MnemonicCreateModalProvider,
  useMnemonicCreateModal,
} from "@ui/apps/dashboard/routes/Settings/Mnemonics/MnemonicCreateModal"
import { chainsMapAtomFamily, evmNetworksMapAtomFamily } from "@ui/atoms"
import { AccountAddMnemonicDropdown } from "@ui/domains/Account/AccountAdd/AccountAddDerived/AccountAddMnemonicDropdown"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { MetadataQrCode } from "@ui/domains/Sign/Qr/MetadataQrCode"
import { NetworkSpecsQrCode } from "@ui/domains/Sign/Qr/NetworkSpecsQrCode"
import { useAppState } from "@ui/hooks/useAppState"
import useChains from "@ui/hooks/useChains"
import { useMnemonic } from "@ui/hooks/useMnemonics"
import { atom, useAtomValue } from "jotai"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Button, Dropdown } from "talisman-ui"

import { DashboardLayout } from "../../layout/DashboardLayout"

const SetVerifierCertificateContentInner = () => {
  const { t } = useTranslation("admin")
  const navigate = useNavigate()

  const [mnemonicId, setMnemonicId] = useState<string | null>(null)
  const { generateMnemonic } = useMnemonicCreateModal()

  const handleCancelClick = useCallback(() => {
    navigate("/settings/networks-tokens")
  }, [navigate])

  const handleContinueClick = useCallback(async () => {
    try {
      if (!mnemonicId) {
        const newMnemonic = await generateMnemonic()
        if (!newMnemonic) return
        const { mnemonic, confirmed } = newMnemonic
        await api.setVerifierCertMnemonic("new", { mnemonic, confirmed })
      } else {
        await api.setVerifierCertMnemonic("existing", { mnemonicId })
      }
    } catch (err) {
      log.error("Failed to set verifier certificate", { err })
      notify(
        {
          type: "error",
          title: t("Error"),
          subtitle: t("Failed to set verifier certificate."),
        },
        { autoClose: false }
      )
    }
  }, [generateMnemonic, mnemonicId, t])

  return (
    <div className="text-body-secondary my-12 flex w-full flex-col gap-8">
      <h3 className="text-body text-md mt-4 font-bold">
        {t("First, let's set your Verifier Certificate")}
      </h3>
      <p>
        {t(
          "Talisman's QR codes are generated from live network data and signed with the recovery phrase that you've chosen as Polkadot Vault Verifier Certificate."
        )}
      </p>
      <p>{t("Select the recovery phrase to use a verifier certificate, or generate a new one.")}</p>
      <AccountAddMnemonicDropdown
        label={t("Verifier Certificate")}
        value={mnemonicId}
        onChange={setMnemonicId}
      />
      {mnemonicId && (
        <p>
          <Trans t={t}>
            <span className="text-body">Caution:</span> Once you register networks in Polkadot Vault
            using metadata signed by this Verifier Certificate, changing it or removing it in
            Talisman will cause accounts for those networks held in Polkadot Vault to become
            unusable.
          </Trans>
        </p>
      )}
      <div className="mt-8 flex justify-end gap-8">
        <Button className="w-72" onClick={handleCancelClick}>
          {t("Back")}
        </Button>
        <Button className="w-72" primary onClick={handleContinueClick}>
          {t("Continue")}
        </Button>
      </div>
    </div>
  )
}

const SetVerifierCertificateContent = () => (
  <MnemonicCreateModalProvider>
    <SetVerifierCertificateContentInner />
    <MnemonicCreateModal />
  </MnemonicCreateModalProvider>
)

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
      <SecretIcon className="shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  )
}

const MetadataPortalContent = () => {
  const { t } = useTranslation("admin")
  const { chains } = useChains({ activeOnly: false, includeTestnets: true })
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
              defaults="Talisman's QR codes are generated from live network data and signed with the recovery phrase that you've chosen as Polkadot Vault Verifier Certificate. <Link>Learn more</Link>"
            />
          </p>
          <p className="flex items-center gap-3">
            <span className="whitespace-nowrap">
              {t("Your Verifier Certificate recovery phrase is")}
            </span>
            <MnemonicButton label={mnemonic?.name ?? "Unknown"} />
          </p>
          <p>
            <Trans t={t}>
              <span className="text-body">Caution:</span> If you change or remove your Verifier
              Certificate recovery phrase, existing accounts held in Polkadot Vault may become
              unusable.
            </Trans>
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
            <div className="relative flex aspect-square w-[40rem] justify-center bg-white p-12">
              <div className="text-body-secondary absolute left-1/2 top-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-8">
                <LoaderIcon className="animate-spin-slow text-3xl" />
              </div>
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
  )
}

const preloadAtom = atom(async (get) => {
  await Promise.all([
    get(chainsMapAtomFamily({ activeOnly: true, includeTestnets: false })),
    get(evmNetworksMapAtomFamily({ activeOnly: true, includeTestnets: false })),
  ])
})

export const QrMetadataPage = () => {
  const { t } = useTranslation("admin")
  useAtomValue(preloadAtom)

  const [certifierMnemonicId] = useAppState("vaultVerifierCertificateMnemonicId")
  const mnemonic = useMnemonic(certifierMnemonicId)

  return (
    <DashboardLayout centered withBack backTo="/settings/networks-tokens">
      <HeaderBlock
        title={t("Polkadot Vault Metadata")}
        text={t("Register networks on your Polkadot Vault device, or update their metadata.")}
      />
      {mnemonic ? <MetadataPortalContent /> : <SetVerifierCertificateContent />}
    </DashboardLayout>
  )
}
