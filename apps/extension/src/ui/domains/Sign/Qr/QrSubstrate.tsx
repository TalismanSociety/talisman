import { isJsonPayload } from "@extension/core"
import { SignerPayloadJSON, SignerPayloadRaw } from "@extension/core"
import { AccountJsonQr } from "@extension/core"
import { POLKADOT_VAULT_DOCS_URL } from "@extension/shared"
import { HexString } from "@polkadot/util/types"
import { Chain } from "@talismn/chaindata-provider"
import { ChevronLeftIcon, InfoIcon, LoaderIcon, PolkadotVaultIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { ScanQr } from "@ui/domains/Sign/Qr/ScanQr"
import { useChainByGenesisHash } from "@ui/hooks/useChainByGenesisHash"
import { ReactElement, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Button, Drawer, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { ExtrinsicQrCode } from "./ExtrinsicQrCode"
import { MetadataQrCode } from "./MetadataQrCode"
import { NetworkSpecsQrCode } from "./NetworkSpecsQrCode"
import {
  QrCodeSource,
  QrCodeSourceSelector,
  QrCodeSourceSelectorProps,
  useQrCodeSourceSelectorState,
} from "./QrCodeSourceSelector"

type SendScanState = {
  page: "SEND"
  // show the chainspec drawer for the user to add the current chain to their device
  showChainspecDrawer?: boolean
  // show instructions to add an account for the chain, after adding the chainspec
  showEnableNetwork?: boolean
  // show the drawer instructing users that they may need to update their metadata
  showUpdateMetadataDrawer?: boolean
}

type ScanState =
  // waiting for user to inspect tx and click button
  | { page: "INIT" }
  // waiting for user to scan and sign qr code on their device
  | SendScanState
  // waiting for user to scan the updated metadata qr code on their device
  | { page: "UPDATE_METADATA" }
  // waiting for user to scan qr code from their device to return the signature
  | { page: "RECEIVE" }

interface Props {
  account: AccountJsonQr
  className?: string
  genesisHash?: HexString
  onSignature?: (result: { signature: `0x${string}` }) => void
  onReject: () => void
  payload: SignerPayloadJSON | SignerPayloadRaw
  containerId: string
  skipInit?: boolean
  narrowMargin?: boolean
}

export const QrSubstrate = ({
  account,
  className = "",
  genesisHash,
  onSignature,
  onReject,
  payload,
  containerId,
  // in the sign tx popup it makes sense to show an INIT state
  // in the send funds popup it does not
  skipInit = false,
  // the send funds popup has a narrower margin on the bottom
  // than the sign tx popup does
  // we replicate that here so that the buttons at the bottom don't
  // move around when switching to this component
  narrowMargin = false,
}: Props): ReactElement<Props> => {
  const { t } = useTranslation("request")
  const [scanState, setScanState] = useState<ScanState>(
    skipInit ? { page: "SEND" } : { page: "INIT" }
  )
  const chain = useChainByGenesisHash(genesisHash)
  const qrCodeSourceSelectorState = useQrCodeSourceSelectorState(genesisHash)
  const { qrCodeSource } = qrCodeSourceSelectorState

  if (scanState.page === "INIT")
    return (
      <div className={classNames("flex w-full flex-col items-center", className)}>
        <div className="flex w-full items-center gap-12">
          <Button className="w-full" onClick={onReject}>
            {t("Cancel")}
          </Button>
          <Button className="w-full" primary onClick={() => setScanState({ page: "SEND" })}>
            {t("Sign with QR")}
          </Button>
        </div>
      </div>
    )

  return (
    <div
      className={classNames(
        "bg-black-primary absolute left-0 top-0 flex h-full w-full flex-col items-center",
        className
      )}
    >
      {/* don't show header on UPDATE_METADATA view */}
      {scanState.page !== "UPDATE_METADATA" && (
        <header className="text-body-secondary flex h-32 min-h-[6.4rem] w-full items-center px-12">
          <button
            type="button"
            className="flex h-16 w-16 cursor-pointer items-center p-2 text-lg hover:text-white"
            onClick={() => {
              setScanState((scanState) => {
                // if back is clicked and we're on the first page, reject the signing attempt
                // (which is INIT when skipInit is false, or SEND when it's true)
                if (scanState.page === "INIT") onReject()
                if (skipInit && scanState.page === "SEND") onReject()

                // if we're on the SEND page, go back to the INIT page
                if (!skipInit && scanState.page === "SEND") return { page: "INIT" }
                // if we're on any other page, go back to the SEND page
                return { page: "SEND" }
              })
            }}
          >
            <ChevronLeftIcon />
          </button>
          <span className="grow text-center">{t("Scan QR code")}</span>
          <span className="h-16 w-16">&nbsp;</span>
        </header>
      )}
      <section
        className={classNames(
          "w-full grow",
          // don't pad the UPDATE_METADATA view
          scanState.page !== "UPDATE_METADATA" && "px-12"
        )}
      >
        {/*
         ** SEND page
         */}
        {scanState.page === "SEND" && (
          <SendPage
            account={account}
            genesisHash={genesisHash}
            payload={payload}
            setScanState={setScanState}
            reject={onReject}
            scanState={scanState}
            qrCodeSource={qrCodeSource}
            qrCodeSourceSelectorState={qrCodeSourceSelectorState}
            chain={chain}
            containerId={containerId}
          />
        )}

        {/*
         ** UPDATE_METADATA page
         */}
        {scanState.page === "UPDATE_METADATA" && (
          <div className="flex h-full w-full flex-col items-center justify-between">
            <div className="relative flex aspect-square w-full items-center justify-center bg-white p-12">
              <div className="text-body-secondary absolute left-1/2 top-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-8">
                <LoaderIcon className="animate-spin-slow text-3xl" />
              </div>
              {qrCodeSource && isJsonPayload(payload) && (
                <MetadataQrCode
                  genesisHash={payload.genesisHash}
                  specVersion={payload.specVersion}
                  qrCodeSource={qrCodeSource}
                />
              )}
              {!qrCodeSource && <>{t("The selected source is unavailable.")}</>}
            </div>
            <QrCodeSourceSelector className="mt-4 text-base" {...qrCodeSourceSelectorState} />
            <div className="text-body-secondary mt-10 max-w-md text-center leading-10">
              {t(
                "Scan the QR video with the Polkadot Vault app on your phone to update your metadata."
              )}
            </div>
            <div></div>
          </div>
        )}

        {/*
         ** RECEIVE page
         */}
        {scanState.page === "RECEIVE" && onSignature && (
          <div className="flex h-full flex-col items-center justify-between">
            <ScanQr type="signature" onScan={onSignature} size={280} />
            <div className="text-body-secondary mt-10 max-w-md text-center leading-10">
              {t("Scan the Polkadot Vault QR code.")}
              <br />
              {t("The image is blurred for security, but this does not affect the reading.")}
            </div>
            <div></div>
          </div>
        )}
      </section>
      <footer
        className={classNames(
          "flex w-full shrink-0 items-center gap-12 px-12",
          // the send funds popup has a narrower margin on the bottom
          // than the sign tx popup does
          // we replicate that here so that the buttons at the bottom don't
          // move around when switching to this component
          narrowMargin ? "py-8" : "py-10"
        )}
      >
        {scanState.page === "SEND" && (
          <>
            <Button className="w-full" onClick={onReject}>
              {t("Cancel")}
            </Button>
            <Button className="w-full" primary onClick={() => setScanState({ page: "RECEIVE" })}>
              {t("Next")}
            </Button>
          </>
        )}
        {scanState.page === "UPDATE_METADATA" && (
          <Button className="w-full" primary onClick={() => setScanState({ page: "SEND" })}>
            {t("Done")}
          </Button>
        )}
        {scanState.page === "RECEIVE" && onSignature && (
          <Button className="w-full" onClick={onReject}>
            {t("Cancel")}
          </Button>
        )}
      </footer>
    </div>
  )
}

const SendPage = ({
  account,
  genesisHash,
  payload,
  reject,
  setScanState,
  scanState,
  qrCodeSource,
  qrCodeSourceSelectorState,
  chain,
  containerId,
}: {
  account: AccountJsonQr
  genesisHash: HexString | undefined
  payload: SignerPayloadJSON | SignerPayloadRaw
  reject: () => void
  setScanState: React.Dispatch<React.SetStateAction<ScanState>>
  scanState: SendScanState
  qrCodeSource: QrCodeSource | undefined
  qrCodeSourceSelectorState: QrCodeSourceSelectorProps
  chain: Chain | null
  containerId: string
}) => {
  const { t } = useTranslation("request")
  return (
    <>
      <div className="flex h-full flex-col items-center justify-end">
        <div className="relative flex aspect-square w-full max-w-md items-center justify-center rounded-xl bg-white p-12">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <LoaderIcon className="animate-spin-slow text-body-secondary !text-3xl" />
          </div>
          <ExtrinsicQrCode account={account} genesisHash={genesisHash} payload={payload} />
        </div>

        <div className="text-body-secondary mb-10 mt-14 max-w-md text-center leading-10">
          <Trans t={t}>
            Scan the QR code with the
            <br />
            Polkadot Vault app on your phone.
          </Trans>
        </div>

        {isJsonPayload(payload) ? (
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="text-grey-400 bg-grey-800 hover:bg-grey-750 inline-block rounded-full px-6 py-4 text-sm font-light"
                onClick={() => setScanState({ page: "SEND", showChainspecDrawer: true })}
              >
                {t("Add Network")}
              </button>
              <button
                type="button"
                className="bg-primary/10 text-primary hover:bg-primary/20 inline-block rounded-full px-6 py-4 text-sm font-light"
                onClick={() => setScanState({ page: "UPDATE_METADATA" })}
              >
                {t("Update Metadata")}
              </button>
            </div>
            <button
              type="button"
              className="text-grey-200 mt-8 text-xs font-light hover:text-white"
              onClick={() => setScanState({ page: "SEND", showUpdateMetadataDrawer: true })}
            >
              {t("Still seeing an error?")}
            </button>
          </div>
        ) : (
          <div></div>
        )}
      </div>

      <Drawer
        anchor="bottom"
        isOpen={!qrCodeSource && !!chain}
        containerId={containerId}
        onDismiss={reject}
      >
        <div className="bg-black-tertiary flex flex-col items-center rounded-t p-12">
          <div className="mb-16 font-bold">{t("Unable to sign")}</div>
          <div className="text-body-secondary mb-16 max-w-md text-center text-sm leading-10">
            {t(
              "Your Polkadot Vault app needs data about this network to sign this transaction, but no secure source of network data is available. You will be unable to sign this transaction."
            )}
            <p className="mt-6">
              <a
                href={POLKADOT_VAULT_DOCS_URL}
                target="_blank"
                className="hover:text-body text-grey-200"
              >
                {t("Learn more")}
              </a>
              .
            </p>
          </div>
          <div className="flex w-full flex-col gap-4">
            <Button className="w-full" small onClick={reject}>
              {t("Close")}
            </Button>
          </div>
        </div>
      </Drawer>

      <Drawer
        anchor="bottom"
        isOpen={!!scanState.showChainspecDrawer}
        containerId={containerId}
        onDismiss={() => setScanState({ page: "SEND" })}
      >
        <div className="bg-black-tertiary flex flex-col items-center rounded-t p-12">
          <div className="mb-16 font-bold">{t("Add network")}</div>
          <>
            <div className="relative flex aspect-square w-full max-w-[16rem] items-center justify-center rounded bg-white p-7">
              <>
                <div className="text-body-secondary absolute left-1/2 top-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-8">
                  <LoaderIcon className="animate-spin-slow text-xl " />
                </div>
                {!!genesisHash && qrCodeSource && (
                  <NetworkSpecsQrCode genesisHash={genesisHash} qrCodeSource={qrCodeSource} />
                )}
              </>
            </div>

            <QrCodeSourceSelector className="mt-4" {...qrCodeSourceSelectorState} />
            <div className="text-body-secondary mb-16 mt-10 max-w-md text-center text-sm leading-10">
              <Trans
                t={t}
                defaults="Scan the QR code with the Polkadot Vault app on your phone to add the <Chain><ChainLogo />{{chainName}}</Chain> network."
                components={{
                  Chain: <div className="text-body inline-flex items-baseline gap-1" />,
                  ChainLogo: <ChainLogo className="self-center" id={chain?.id} />,
                }}
                values={{ chainName: chain?.name ?? t("Unknown") }}
              />
            </div>
          </>

          <div className="flex w-full flex-col gap-4">
            <Button
              className="w-full"
              primary
              small
              onClick={() => setScanState({ page: "SEND", showEnableNetwork: true })}
            >
              {t("Continue")}
            </Button>
            <Button className="w-full" small onClick={() => setScanState({ page: "SEND" })}>
              {t("Cancel")}
            </Button>
          </div>
        </div>
      </Drawer>

      <Drawer
        anchor="bottom"
        isOpen={!!scanState.showEnableNetwork}
        containerId={containerId}
        onDismiss={() => setScanState({ page: "SEND" })}
      >
        <div className="bg-black-tertiary flex max-h-full w-full flex-col items-center rounded-t p-12">
          <div className="mb-12 font-bold">{t("Enable network")}</div>
          <video width="160" controls autoPlay>
            <source src="/videos/add-network-vault.mp4" type="video/mp4" />
          </video>
          <div className="text-body-secondary mb-16 mt-10 w-full px-10 text-center text-sm leading-10">
            <Trans
              t={t}
              defaults="You will need to create a derived key in your Polkadot Vault to enable this network.
              This new key must use the same derivation path <InfoIcon /> as your existing account."
              components={{
                InfoIcon: (
                  <Tooltip placement="bottom-end">
                    <TooltipTrigger className="hover:text-body">
                      <InfoIcon className="inline" />
                    </TooltipTrigger>
                    <TooltipContent>
                      {t("In most cases, this derivation path should be blank")}
                    </TooltipContent>
                  </Tooltip>
                ),
              }}
            />{" "}
            <a
              href={POLKADOT_VAULT_DOCS_URL}
              target="_blank"
              className="hover:text-body text-grey-200"
            >
              {t("Learn more")}
            </a>
          </div>
          <Button className="w-full" primary small onClick={() => setScanState({ page: "SEND" })}>
            {t("Done")}
          </Button>
        </div>
      </Drawer>

      <Drawer
        anchor="bottom"
        isOpen={!!scanState.showUpdateMetadataDrawer}
        containerId={containerId}
        onDismiss={() => setScanState({ page: "SEND" })}
      >
        <div className="bg-black-tertiary flex flex-col items-center rounded-t p-12">
          <PolkadotVaultIcon className="mb-10 h-auto w-16" />
          <div className="mb-5 font-bold">{t("You may need to update metadata")}</div>
          <div className="text-body-secondary max-w-md text-center text-sm leading-10">
            {t(
              "If you’re receiving an error on your Polkadot Vault when trying to scan the QR code, it likely means your metadata is out of date."
            )}
          </div>
          <div className="py-8">
            <a
              href={POLKADOT_VAULT_DOCS_URL}
              target="_blank"
              className="text-grey-200 mt-8 text-xs font-light hover:text-white"
            >
              {t("Still seeing an error?")}
            </a>
          </div>
          <Button
            className="mb-4 w-full"
            primary
            small
            onClick={() => setScanState({ page: "UPDATE_METADATA" })}
          >
            {t("Update Metadata")}
          </Button>
          <Button small className="w-full" onClick={() => setScanState({ page: "SEND" })}>
            {t("Cancel")}
          </Button>
        </div>
      </Drawer>
    </>
  )
}
