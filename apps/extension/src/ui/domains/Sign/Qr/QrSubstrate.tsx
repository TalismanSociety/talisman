import { AccountJsonQr } from "@core/domains/accounts/types"
import { SignerPayloadJSON, SignerPayloadRaw } from "@core/domains/signing/types"
import { isJsonPayload } from "@core/util/isJsonPayload"
import { Drawer } from "@talisman/components/Drawer"
import { LoaderIcon, ParitySignerIcon } from "@talisman/theme/icons"
import { ChevronLeftIcon } from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { ScanQr } from "@ui/domains/Sign/Qr/ScanQr"
import useChainByGenesisHash from "@ui/hooks/useChainByGenesisHash"
import { ReactElement, useState } from "react"
import { Button } from "talisman-ui"

import { ExtrinsicQrCode } from "./ExtrinsicQrCode"
import { MetadataQrCode } from "./MetadataQrCode"
import { NetworkSpecsQrCode } from "./NetworkSpecsQrCode"

type ScanState =
  // waiting for user to inspect tx and click button
  | { page: "INIT" }
  // waiting for user to scan and sign qr code on their device
  | {
      page: "SEND"
      // show the chainspec drawer for the user to add the current chain to their device
      showChainspecDrawer?: boolean
      // show the drawer instructing users that they may need to update their metadata
      showUpdateMetadataDrawer?: boolean
    }
  // waiting for user to scan the updated metadata qr code on their device
  | { page: "UPDATE_METADATA" }
  // waiting for user to scan qr code from their device to return the signature
  | { page: "RECEIVE" }

interface Props {
  account: AccountJsonQr
  className?: string
  genesisHash?: string
  onSignature?: (result: { signature: `0x${string}` }) => void
  onReject: () => void
  payload: SignerPayloadJSON | SignerPayloadRaw
  parent?: HTMLElement | string | null
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
  parent,
  // in the sign tx popup it makes sense to show an INIT state
  // in the send funds popup it does not
  skipInit = false,
  // the send funds popup has a narrower margin on the bottom
  // than the sign tx popup does
  // we replicate that here so that the buttons at the bottom don't
  // move around when switching to this component
  narrowMargin = false,
}: Props): ReactElement<Props> => {
  const [scanState, setScanState] = useState<ScanState>(
    skipInit ? { page: "SEND" } : { page: "INIT" }
  )
  const chain = useChainByGenesisHash(genesisHash)

  if (scanState.page === "INIT")
    return (
      <div className={classNames("flex w-full flex-col items-center", className)}>
        <div className="flex w-full items-center gap-12">
          <Button className="w-full" onClick={onReject}>
            Cancel
          </Button>
          <Button className="w-full" primary onClick={() => setScanState({ page: "SEND" })}>
            Sign with QR
          </Button>
        </div>
      </div>
    )

  return (
    <div
      className={classNames(
        "bg-black-primary absolute top-0 left-0 flex h-full w-full flex-col items-center",
        className
      )}
    >
      {/* don't show header on UPDATE_METADATA view */}
      {scanState.page !== "UPDATE_METADATA" && (
        <header className="text-body-secondary flex h-32 min-h-[6.4rem] w-full items-center px-12">
          <button
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
          <span className="grow text-center">Scan QR code</span>
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
          <>
            <div className="flex h-full flex-col items-center justify-end">
              <div className="relative flex aspect-square w-full max-w-md items-center justify-center rounded-xl bg-white p-10">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <LoaderIcon className="animate-spin-slow text-body-secondary !text-3xl" />
                </div>
                <ExtrinsicQrCode account={account} genesisHash={genesisHash} payload={payload} />
              </div>

              <div className="text-body-secondary mt-14 mb-10 max-w-md text-center leading-10">
                Scan the QR code with the
                <br />
                Parity Signer app on your phone.
              </div>

              {isJsonPayload(payload) ? (
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-4">
                    <button
                      className="text-grey-400 bg-grey-800 hover:bg-grey-750 inline-block rounded-full py-4 px-6 text-sm font-light"
                      onClick={() => setScanState({ page: "SEND", showChainspecDrawer: true })}
                    >
                      Add Network
                    </button>
                    <button
                      className="bg-primary/10 text-primary hover:bg-primary/20 inline-block rounded-full py-4 px-6 text-sm font-light"
                      onClick={() => setScanState({ page: "UPDATE_METADATA" })}
                    >
                      Update Metadata
                    </button>
                  </div>
                  <button
                    className="text-grey-200 mt-8 text-xs font-light hover:text-white"
                    onClick={() => setScanState({ page: "SEND", showUpdateMetadataDrawer: true })}
                  >
                    Seeing a Parity Signer error?
                  </button>
                </div>
              ) : (
                <div></div>
              )}
            </div>

            {scanState.showChainspecDrawer && (
              <Drawer
                anchor="bottom"
                open={true}
                parent={parent}
                onClose={() => setScanState({ page: "SEND" })}
              >
                <div className="bg-black-tertiary flex flex-col items-center rounded-t p-12">
                  <div className="mb-16 font-bold">Add network</div>
                  <div className="relative mb-16 flex aspect-square w-full max-w-[16rem] items-center justify-center rounded bg-white p-4">
                    <div className="text-body-secondary absolute top-1/2 left-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-8">
                      <LoaderIcon className="animate-spin-slow text-xl " />
                    </div>
                    {!!genesisHash && <NetworkSpecsQrCode genesisHash={genesisHash} />}
                  </div>
                  <div className="text-body-secondary mb-16 max-w-md text-center text-sm leading-10">
                    Scan the QR code with the Parity Signer app on your phone to add the{" "}
                    <div className="text-body inline-flex items-baseline gap-1">
                      <ChainLogo className="self-center" id={chain?.id} />
                      {chain?.name ?? "Unknown"}
                    </div>{" "}
                    network.
                  </div>
                  <Button
                    className="w-full"
                    primary
                    small
                    onClick={() => setScanState({ page: "SEND" })}
                  >
                    Done
                  </Button>
                </div>
              </Drawer>
            )}

            {scanState.showUpdateMetadataDrawer && (
              <Drawer
                anchor="bottom"
                open={true}
                parent={parent}
                onClose={() => setScanState({ page: "SEND" })}
              >
                <div className="bg-black-tertiary flex flex-col items-center rounded-t p-12">
                  <ParitySignerIcon className="mb-10 h-auto w-16" />
                  <div className="mb-5 font-bold">You may need to update metadata</div>
                  <div className="text-body-secondary mb-10 max-w-md text-center text-sm leading-10">
                    If you’re receiving an error on your Parity Signer when trying to scan the QR
                    code, it likely means your metadata is out of date.
                  </div>
                  <Button
                    className="mb-4 w-full"
                    primary
                    small
                    onClick={() => setScanState({ page: "UPDATE_METADATA" })}
                  >
                    Update Metadata
                  </Button>
                  <Button small className="w-full" onClick={() => setScanState({ page: "SEND" })}>
                    Cancel
                  </Button>
                </div>
              </Drawer>
            )}
          </>
        )}

        {/*
         ** UPDATE_METADATA page
         */}
        {scanState.page === "UPDATE_METADATA" && (
          <div className="flex h-full w-full flex-col items-center justify-between">
            <div className="relative flex aspect-square w-full items-center justify-center bg-white p-12">
              <div className="text-body-secondary absolute top-1/2 left-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-8">
                <LoaderIcon className="animate-spin-slow text-3xl" />
              </div>
              {isJsonPayload(payload) && (
                <MetadataQrCode
                  genesisHash={payload.genesisHash}
                  specVersion={payload.specVersion}
                />
              )}
            </div>
            <div className="text-body-secondary mt-10 max-w-md text-center leading-10">
              Scan the QR video with the Parity Signer app on your phone to update your metadata.
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
              Scan the Parity Signer QR code.
              <br />
              The image is blurred for security, but this does not affect the reading.
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
              Cancel
            </Button>
            <Button className="w-full" primary onClick={() => setScanState({ page: "RECEIVE" })}>
              Next
            </Button>
          </>
        )}
        {scanState.page === "UPDATE_METADATA" && (
          <Button className="w-full" primary onClick={() => setScanState({ page: "SEND" })}>
            Done
          </Button>
        )}
        {scanState.page === "RECEIVE" && onSignature && (
          <Button className="w-full" onClick={onReject}>
            Cancel
          </Button>
        )}
      </footer>
    </div>
  )
}
