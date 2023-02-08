import { AccountJsonQr } from "@core/domains/accounts/types"
import { SignerPayloadJSON, SignerPayloadRaw } from "@core/domains/signing/types"
import { wrapBytes } from "@polkadot/extension-dapp/wrapBytes"
import { QrDisplayPayload } from "@polkadot/react-qr"
import { TypeRegistry } from "@polkadot/types"
import type { HexString } from "@polkadot/util/types"
import { Drawer } from "@talisman/components/Drawer"
import { ParitySignerIcon } from "@talisman/theme/icons"
import { ChevronLeftIcon } from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import { ScanQr } from "@ui/domains/Sign/ScanQr"
import useChains from "@ui/hooks/useChains"
import { ReactElement, useEffect, useState } from "react"
import { Button } from "talisman-ui"

import { LedgerSigningStatus } from "./LedgerSigningStatus"

const CMD_MORTAL = 2
const CMD_SIGN_MESSAGE = 3

type ScanState =
  // waiting for user to inspect tx and click button
  | "INIT"
  // waiting for user to scan and sign qr code on their device
  | "SEND"
  // waiting for user to decide whether or not they need to update their metadata
  | "UPDATE_METADATA_PROMPT"
  // waiting for user to scan the updated metadata qr code on their device
  | "UPDATE_METADATA"
  // waiting for user to scan qr code from their device to return the signature
  | "RECEIVE"

interface Props {
  account: AccountJsonQr
  className?: string
  genesisHash?: string
  onSignature?: ({ signature }: { signature: HexString }) => void
  onReject: () => void
  payload: SignerPayloadJSON | SignerPayloadRaw
  parent?: HTMLElement | null
}

const registry = new TypeRegistry()
function isRawPayload(payload: SignerPayloadJSON | SignerPayloadRaw): payload is SignerPayloadRaw {
  return !!(payload as SignerPayloadRaw).data
}

export const QrSubstrate = ({
  account,
  className = "",
  genesisHash,
  onSignature,
  onReject,
  payload,
  parent,
}: Props): ReactElement<Props> => {
  const [scanState, setScanState] = useState<ScanState>("INIT")
  const [error, setError] = useState<string | null>(null)
  const [cmd, setCmd] = useState<typeof CMD_MORTAL | typeof CMD_SIGN_MESSAGE>(CMD_MORTAL)
  const [unsigned, setUnsigned] = useState<Uint8Array>()
  const { chains } = useChains(true)
  const chain = chains.find((chain) => chain.genesisHash === genesisHash)

  useEffect(() => {
    if (isRawPayload(payload)) {
      setCmd(CMD_SIGN_MESSAGE)
      setUnsigned(wrapBytes(payload.data))
    } else {
      if (payload.signedExtensions) registry.setSignedExtensions(payload.signedExtensions)
      const { version } = payload
      const extrinsicPayload = registry.createType("ExtrinsicPayload", payload, { version })
      setCmd(CMD_MORTAL)
      setUnsigned(extrinsicPayload.toU8a())
    }
  }, [payload])

  useEffect(() => {
    if (genesisHash) return
    if (cmd === CMD_MORTAL) return

    setError(
      "Parity Signer only supports plain message signing for wallets which are locked to a single network."
    )
  }, [genesisHash, cmd])

  if (scanState === "INIT")
    return (
      <div className={classNames("flex w-full flex-col", className)}>
        <div className="flex w-full gap-12">
          <Button className="w-full" onClick={onReject}>
            Cancel
          </Button>
          <Button className="w-full" primary onClick={() => setScanState("SEND")}>
            Sign with QR
          </Button>
        </div>
        {error && (
          <Drawer anchor="bottom" open={true} parent={parent}>
            <LedgerSigningStatus
              message={error ? error : ""}
              status={error ? "error" : undefined}
              confirm={onReject}
            />
          </Drawer>
        )}
      </div>
    )

  return (
    <div
      className={classNames(
        "bg-black-primary absolute top-0 left-0 flex h-full w-full flex-col",
        className
      )}
    >
      {scanState !== "UPDATE_METADATA" && (
        <header className="text-grey-400 grid h-32 w-full shrink-0 grid-cols-3 items-center px-12">
          <span
            className="flex h-16 w-16 cursor-pointer items-center p-2"
            onClick={() => setScanState((scanState) => (scanState === "RECEIVE" ? "SEND" : "INIT"))}
          >
            <ChevronLeftIcon className="h-full w-full " />
          </span>
          <span className="text-grey-600 text-center text-sm">Scan QR code</span>
          <span>&nbsp;</span>
        </header>
      )}
      <section className={classNames("grow", "w-full", scanState !== "UPDATE_METADATA" && "px-12")}>
        {["SEND", "UPDATE_METADATA_PROMPT"].includes(scanState) && unsigned && (
          <div className="flex h-full flex-col justify-between">
            <QrDisplayPayload
              className="max-w-md rounded-xl bg-white p-12"
              address={account?.address}
              cmd={cmd ?? CMD_MORTAL}
              genesisHash={genesisHash ?? "0x"}
              payload={unsigned}
            />

            <div className="text-body-secondary mt-10 max-w-md text-center leading-10">
              Scan QR code with the
              <br />
              Parity Signer app on your phone.
            </div>

            {typeof chain?.latestMetadataQrUrl === "string" ? (
              <div className="flex flex-col">
                <button
                  className="bg-primary/10 text-primary inline-block rounded-full py-4 px-6 text-sm font-light"
                  onClick={() => setScanState("UPDATE_METADATA_PROMPT")}
                >
                  Update Metadata
                </button>
                <button
                  className="text-grey-50 p-4 text-xs font-light"
                  onClick={() => setScanState("UPDATE_METADATA_PROMPT")}
                >
                  I'm seeing an error
                </button>
              </div>
            ) : (
              <div></div>
            )}
          </div>
        )}

        {scanState === "UPDATE_METADATA_PROMPT" && (
          <Drawer anchor="bottom" open={true} parent={parent}>
            <div className="bg-black-tertiary flex flex-col rounded-t p-12">
              <ParitySignerIcon className="mb-10 h-auto w-16" />
              <div className="mb-5 font-bold">You may need to update metadata</div>
              <div className="text-body-secondary mb-10 max-w-md text-center text-sm leading-10">
                If you’re receiving an error on your Parity Signer when trying to scan the QR code,
                it likely means your metadata is out of date.
              </div>
              <Button
                className="mb-4 w-full"
                primary
                small
                onClick={() => setScanState("UPDATE_METADATA")}
              >
                Update Metadata
              </Button>
              <Button small className="w-full" onClick={() => setScanState("SEND")}>
                Cancel
              </Button>
            </div>
          </Drawer>
        )}

        {scanState === "UPDATE_METADATA" && (
          <div className="flex h-full w-full flex-col justify-between">
            <img
              className="aspect-square w-full bg-white p-10"
              src={chain?.latestMetadataQrUrl ?? undefined}
            />
            <div className="text-body-secondary mt-10 max-w-md text-center leading-10">
              Scan the QR video with the Parity Signer app on your phone to update your metadata.
            </div>
            <div></div>
          </div>
        )}

        {scanState === "RECEIVE" && onSignature && (
          <div className="flex h-full flex-col justify-between">
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
      <footer className="flex w-full shrink-0 gap-12 px-12 py-10">
        {["SEND", "UPDATE_METADATA_PROMPT", "UPDATE_METADATA"].includes(scanState) && unsigned && (
          <>
            {scanState === "UPDATE_METADATA" ? (
              <Button key="back" className="w-full" onClick={() => setScanState("SEND")}>
                Back
              </Button>
            ) : (
              <Button className="w-full" onClick={onReject}>
                Cancel
              </Button>
            )}
            <Button className="w-full" primary onClick={() => setScanState("RECEIVE")}>
              Next
            </Button>
          </>
        )}
        {scanState === "RECEIVE" && onSignature && (
          <Button className="w-full" onClick={onReject}>
            Cancel
          </Button>
        )}
      </footer>
    </div>
  )
}
