import { AccountJsonQr } from "@core/domains/accounts/types"
import { SignerPayloadJSON, SignerPayloadRaw } from "@core/domains/signing/types"
import { wrapBytes } from "@polkadot/extension-dapp/wrapBytes"
import { createSignPayload, decodeString } from "@polkadot/react-qr/util"
import { TypeRegistry } from "@polkadot/types"
import type { HexString } from "@polkadot/util/types"
import { Drawer } from "@talisman/components/Drawer"
import { LoaderIcon, ParitySignerIcon } from "@talisman/theme/icons"
import { ChevronLeftIcon } from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { ScanQr } from "@ui/domains/Sign/ScanQr"
import useChains from "@ui/hooks/useChains"
import QrCodeStyling from "qr-code-styling"
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
  // waiting for user to scan the chainspec qr code on their device
  | "CHAINSPEC"
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

  const [qrCode, setQrCode] = useState<string | null>(null)
  useEffect(() => {
    if (!unsigned) return

    const data = createSignPayload(
      account?.address,
      cmd ?? CMD_MORTAL,
      unsigned,
      genesisHash ?? "0x"
    )
    if (!data) return

    const talismanRedHandSvg =
      `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODIiIGhlaWdodD0iODIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTYyLj` +
      `U3MSA0NS40MjVjLTEuMDMgMS4wMy0yLjgyMi41NjMtMy40MzEtLjc2M2ExLjk4MiAxLjk4MiAwIDAgMS0uMTg1LS44MjlWMjAuOTg5YTUuMDAzIDUuMDAzIDAgMCAwLT` +
      `EwLjAwNSAwdjExLjU2MmMwIC45OTQtMS4wMTcgMS42NjktMS45NjcgMS4zN2ExLjQ1NCAxLjQ1NCAwIDAgMS0xLjAzMi0xLjM2N1YxMy45ODdhNS4wMDMgNS4wMDMgMC` +
      `AwIDAtMTAuMDA1IDB2MTguNTY4YTEuNDU0IDEuNDU0IDAgMCAxLTEuMDM0IDEuMzY3Yy0uOTQ5LjMtMS45NjgtLjM3Ni0xLjk2OC0xLjM3MVYyMC45OWE1LjAwMyA1Lj` +
      `AwMyAwIDAgMC0xMC4wMDUgMHYyMi44NTNjMCAuMjgyLS4wNjQuNTU2LS4xODIuODE0LS41OTYgMS4yOTQtMi4zNDYgMS43NDctMy4zNTUuNzRsLTEuODYxLTEuODYxYT` +
      `UuMDAyIDUuMDAyIDAgMCAwLTcuMDc1IDcuMDc0bDE0LjcwNiAxNC43MDdhMTkuOTc2IDE5Ljk3NiAwIDAgMCAxNS43NzQgNy42OTdjNi4xNDMgMCAxMS42MzgtMi43Nj` +
      `cgMTUuMzEtNy4xMjRsMTUuMjgtMTUuMjhhNS4wMDIgNS4wMDIgMCAwIDAtNy4wNzQtNy4wNzR6TTQwLjk0NSA2NS4wMWM4Ljg0IDAgMTYuMDA3LTEwLjAwNSAxNi4wMD` +
      `ctMTAuMDA1cy03LjE2Ni0xMC4wMDQtMTYuMDA3LTEwLjAwNC0xNi4wMDcgMTAuMDA0LTE2LjAwNyAxMC4wMDRTMzIuMTA1IDY1LjAxIDQwLjk0NSA2NS4wMXoiIGNsaX` +
      `AtcnVsZT0iZXZlbm9kZCIgZmlsbD0iI2ZkNDg0OCIgZmlsbC1ydWxlPSJldmVub2RkIi8+PHBhdGggZD0iTTQ2Ljk0OSA1NS4wMDVhNi4wMDMgNi4wMDMgMCAxIDEtMT` +
      `IuMDA2IDAgNi4wMDMgNi4wMDMgMCAwIDEgMTIuMDA2IDB6IiBmaWxsPSIjZmQ0ODQ4Ii8+PC9zdmc+`

    new QrCodeStyling({
      data: decodeString(data),
      margin: 0,
      qrOptions: { mode: "Byte", errorCorrectionLevel: "L" },
      dotsOptions: { type: "dots" },
      cornersSquareOptions: { type: "extra-rounded" },
      cornersDotOptions: { type: "dot" },
      image: talismanRedHandSvg,
      imageOptions: { hideBackgroundDots: true, imageSize: 0.7, margin: 5 },
    })
      .getRawData("svg")
      .then((blob) => (blob ? URL.createObjectURL(blob) : blob))
      .then(setQrCode)
  }, [account?.address, cmd, genesisHash, unsigned])

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
        {["SEND", "CHAINSPEC", "UPDATE_METADATA_PROMPT"].includes(scanState) && unsigned && (
          <div className="flex h-full flex-col justify-between">
            <div className="relative flex aspect-square w-full max-w-md items-center justify-center rounded-xl bg-white p-9">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <LoaderIcon className="animate-spin-slow text-black" />
              </div>
              {qrCode ? <img className="relative h-full w-full" src={qrCode} /> : null}
            </div>

            <div className="text-body-secondary mt-10 max-w-md text-center leading-10">
              Scan the QR code with the
              <br />
              Parity Signer app on your phone.
            </div>

            {typeof chain?.chainspecQrUrl === "string" ||
            typeof chain?.latestMetadataQrUrl === "string" ? (
              <div className="flex flex-col">
                <div className="flex gap-4">
                  {typeof chain?.chainspecQrUrl === "string" ? (
                    <button
                      className="text-grey-400 bg-grey-800 hover:bg-grey-750 inline-block rounded-full py-4 px-6 text-sm font-light"
                      onClick={() => setScanState("CHAINSPEC")}
                    >
                      Add Network
                    </button>
                  ) : null}
                  {typeof chain?.latestMetadataQrUrl === "string" ? (
                    <button
                      className="bg-primary/10 text-primary hover:bg-primary/20 inline-block rounded-full py-4 px-6 text-sm font-light"
                      onClick={() => setScanState("UPDATE_METADATA")}
                    >
                      Update Metadata
                    </button>
                  ) : null}
                </div>
                {typeof chain?.latestMetadataQrUrl === "string" ? (
                  <button
                    className="text-grey-50 hover:text-grey-300 mt-2 p-4 text-xs font-light"
                    onClick={() => setScanState("UPDATE_METADATA_PROMPT")}
                  >
                    Seeing a Parity Signer error?
                  </button>
                ) : null}
              </div>
            ) : (
              <div></div>
            )}
          </div>
        )}

        {scanState === "CHAINSPEC" && (
          <Drawer anchor="bottom" open={true} parent={parent}>
            <div className="bg-black-tertiary flex flex-col rounded-t p-12">
              <div className="mb-16 font-bold">Add network</div>
              <div className="relative mb-16 flex aspect-square w-full max-w-[16rem] items-center justify-center rounded-xl bg-white p-4">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <LoaderIcon className="animate-spin-slow text-black" />
                </div>
                {chain?.chainspecQrUrl ? (
                  <img className="relative h-full w-full" src={chain?.chainspecQrUrl} />
                ) : null}
              </div>
              <div className="text-body-secondary mb-16 max-w-md text-center text-sm leading-10">
                Scan the QR code with the Parity Signer app on your phone to add the{" "}
                <div className="text-body inline-flex items-baseline gap-1">
                  <ChainLogo className="self-center" id={chain?.id} />
                  {chain?.name ?? "Unknown"}
                </div>{" "}
                network.
              </div>
              <Button className="w-full" primary small onClick={() => setScanState("SEND")}>
                Done
              </Button>
            </div>
          </Drawer>
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
            <div className="relative flex aspect-square w-full items-center justify-center bg-white p-10">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <LoaderIcon className="animate-spin-slow text-black" />
              </div>
              {chain?.latestMetadataQrUrl ? (
                <img className="relative h-full w-full" src={chain?.latestMetadataQrUrl} />
              ) : null}
            </div>
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
        {["SEND", "CHAINSPEC", "UPDATE_METADATA_PROMPT"].includes(scanState) && unsigned && (
          <>
            <Button className="w-full" onClick={onReject}>
              Cancel
            </Button>
            <Button className="w-full" primary onClick={() => setScanState("RECEIVE")}>
              Next
            </Button>
          </>
        )}
        {scanState === "UPDATE_METADATA" && (
          <Button className="w-full" primary onClick={() => setScanState("SEND")}>
            Done
          </Button>
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
