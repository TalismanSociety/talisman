import { AccountJsonQr } from "@core/domains/accounts/types"
import { SignerPayloadJSON, SignerPayloadRaw } from "@core/domains/signing/types"
import isJsonPayload from "@core/util/isJsonPayload"
import { wrapBytes } from "@polkadot/extension-dapp/wrapBytes"
import { createSignPayload, decodeString } from "@polkadot/react-qr/util"
import { TypeRegistry } from "@polkadot/types"
import { hexToU8a, u8aConcat } from "@polkadot/util"
import QrCodeStyling from "@solana/qr-code-styling"
import { Drawer } from "@talisman/components/Drawer"
import { LoaderIcon, ParitySignerIcon } from "@talisman/theme/icons"
import { ChevronLeftIcon } from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { ScanQr } from "@ui/domains/Sign/ScanQr"
import useChains from "@ui/hooks/useChains"
import { FC, ReactElement, lazy, useEffect, useMemo, useState } from "react"
import { Button } from "talisman-ui"

import { LedgerSigningStatus } from "./LedgerSigningStatus"
import { FRAME_SIZE, talismanRedHandSvg } from "./QrConstants"

const RaptorQrCode = lazy(() => import("./RaptorQrCode"))
const CMD_SIGN_TX = 0
const CMD_SIGN_TX_HASH = 1
const CMD_IMMORTAL = 2
const CMD_SIGN_MESSAGE = 3

type Command =
  | typeof CMD_SIGN_TX
  | typeof CMD_SIGN_TX_HASH
  | typeof CMD_IMMORTAL
  | typeof CMD_SIGN_MESSAGE

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
  onSignature?: (result: { signature: `0x${string}` }) => void
  onReject: () => void
  payload: SignerPayloadJSON | SignerPayloadRaw
  parent?: HTMLElement | string | null
  skipInit?: boolean
  narrowMargin?: boolean
}

function isRawPayload(payload: SignerPayloadJSON | SignerPayloadRaw): payload is SignerPayloadRaw {
  return !!(payload as SignerPayloadRaw).data
}

const registry = new TypeRegistry()

const MultipartQrCode: FC<{ data?: Uint8Array }> = ({ data }) => {
  const [qrCodeFrames, setQrCodeFrames] = useState<Array<string | null> | null>(null)

  useEffect(() => {
    if (!data) return

    const MULTIPART = new Uint8Array([0])
    const encodeNumber = (value: number) => new Uint8Array([value >> 8, value & 0xff])
    const FRAME_SIZE = 1024
    const numberOfFrames = Math.ceil(data.length / FRAME_SIZE)
    const dataFrames = Array.from({ length: numberOfFrames })
      .map((_, index) => data.subarray(index * FRAME_SIZE, (index + 1) * FRAME_SIZE))
      .map((dataFrame, index) =>
        u8aConcat(MULTIPART, encodeNumber(numberOfFrames), encodeNumber(index), dataFrame)
      )

    let cancelled = false
    ;(async () => {
      const qrCodeFrames = []
      for (const dataFrame of dataFrames) {
        const blob = await new QrCodeStyling({
          type: "svg",
          data: decodeString(dataFrame),
          margin: 0,
          qrOptions: { mode: "Byte", errorCorrectionLevel: "L" },
          dotsOptions: { type: "dots" },
          cornersSquareOptions: { type: "extra-rounded" },
          cornersDotOptions: { type: "dot" },
          image: talismanRedHandSvg,
          imageOptions: { hideBackgroundDots: true, imageSize: 0.7 },
        }).getRawData("svg")
        qrCodeFrames.push(blob ? URL.createObjectURL(blob) : blob)
      }

      if (cancelled) return
      setQrCodeFrames(qrCodeFrames)
    })()

    return () => {
      cancelled = true
    }
  }, [data])

  const [qrCode, setQrCode] = useState<string | null>(null)
  useEffect(() => {
    if (qrCodeFrames === null) return setQrCode(null)
    if (qrCodeFrames.length < 1) return setQrCode(null)
    if (qrCodeFrames.length === 1) setQrCode(qrCodeFrames[0])

    let index = 0
    setQrCode(qrCodeFrames[index])
    const interval = setInterval(() => {
      index = (index + 1) % qrCodeFrames.length
      setQrCode(qrCodeFrames[index])
    }, 100)

    return () => clearInterval(interval)
  }, [qrCodeFrames])

  if (!qrCode) return null

  return <img className="relative h-full w-full" src={qrCode} />
}

const QrCode: FC<{ data?: Uint8Array }> = ({ data }) => {
  if (!data) return null
  if (data.length < FRAME_SIZE) return <MultipartQrCode data={data} />
  return <RaptorQrCode data={data} />
}

const NetworkSpecsQrCode: FC<{ genesisHash: string }> = ({ genesisHash }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["chainSpecsQr", genesisHash],
    queryFn: async () => {
      const hexData = await api.chainSpecsQr(genesisHash)
      return hexToU8a(hexData)
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
  })

  return <QrCode data={data} />
}

const MetadataQrCode: FC<{ genesisHash: string; specVersion: string }> = ({
  genesisHash,
  specVersion,
}) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["chainMetadataQr", genesisHash, specVersion],
    queryFn: async () => {
      const hexData = await api.chainMetadataQr(genesisHash, Number(specVersion))
      return hexToU8a(hexData)
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
  })

  return <QrCode data={data} />
}

export const QrSubstrate = ({
  account,
  className = "",
  genesisHash,
  onSignature,
  onReject,
  payload,
  parent,
  // the sign tx popup makes sense to show an INIT state
  // the send funds popup does not
  skipInit = false,
  // the send funds popup has a narrower margin on the bottom
  // than the sign tx popup does
  narrowMargin = false,
}: Props): ReactElement<Props> => {
  const [scanState, setScanState] = useState<ScanState>(skipInit ? "SEND" : "INIT")
  const { chains } = useChains(true)
  const chain = chains.find((chain) => chain.genesisHash === genesisHash)

  const { cmd, unsigned } = useMemo(() => {
    if (isRawPayload(payload)) return { cmd: CMD_SIGN_MESSAGE, unsigned: wrapBytes(payload.data) }

    if (payload.signedExtensions) registry.setSignedExtensions(payload.signedExtensions)
    const { version } = payload
    const extrinsicPayload = registry.createType("ExtrinsicPayload", payload, { version })
    return {
      cmd: extrinsicPayload.era?.isImmortalEra ? CMD_IMMORTAL : CMD_SIGN_TX,
      unsigned: extrinsicPayload.toU8a(),
    }
  }, [payload])

  const error = useMemo(() => {
    return cmd === CMD_SIGN_MESSAGE
      ? "Parity Signer does not support signing plain text messages."
      : undefined
  }, [cmd])

  const data = useMemo(
    () =>
      unsigned && account
        ? createSignPayload(account.address, cmd, unsigned, genesisHash ?? new Uint8Array([0]))
        : undefined,
    [account, cmd, genesisHash, unsigned]
  )

  if (scanState === "INIT")
    return (
      <div className={classNames("flex w-full flex-col items-center", className)}>
        <div className="flex w-full items-center gap-12">
          <Button className="w-full" onClick={onReject}>
            Cancel
          </Button>
          <Button className="w-full" primary onClick={() => setScanState("SEND")}>
            Sign with QR
          </Button>
        </div>
        {error && (
          <Drawer anchor="bottom" open={true} parent={parent}>
            {/* Shouldn't be a LedgerSigningStatus, just an error message */}
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
        "bg-black-primary absolute top-0 left-0 flex h-full w-full flex-col items-center",
        className
      )}
    >
      {scanState !== "UPDATE_METADATA" && (
        <header className="text-body-secondary flex h-32 min-h-[6.4rem] w-full items-center px-12">
          <button
            className="flex h-16 w-16 cursor-pointer items-center p-2 text-lg hover:text-white"
            onClick={() => {
              setScanState((scanState) => {
                if (scanState === "INIT") onReject()
                if (skipInit && scanState === "SEND") onReject()

                if (!skipInit && scanState === "SEND") return "INIT"
                return "SEND"
              })
            }}
          >
            <ChevronLeftIcon />
          </button>
          <span className="grow text-center">Scan QR code</span>
          <span className="h-16 w-16">&nbsp;</span>
        </header>
      )}
      <section className={classNames("grow", "w-full", scanState !== "UPDATE_METADATA" && "px-12")}>
        {["SEND", "CHAINSPEC", "UPDATE_METADATA_PROMPT"].includes(scanState) && unsigned && (
          <div className="flex h-full flex-col items-center justify-end">
            <div className="relative flex aspect-square w-full max-w-md items-center justify-center rounded-xl bg-white p-10">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <LoaderIcon className="animate-spin-slow text-body-secondary !text-3xl" />
              </div>
              <QrCode data={data} />
            </div>

            <div className="text-body-secondary mt-14 mb-10 max-w-md text-center leading-10">
              Scan the QR code with the
              <br />
              Parity Signer app on your phone.
            </div>

            {typeof chain?.chainspecQrUrl === "string" ||
            typeof chain?.latestMetadataQrUrl === "string" ? (
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-4">
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
                    className="text-grey-200 mt-8 text-xs font-light hover:text-white"
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
          <Drawer anchor="bottom" open={true} parent={parent} onClose={() => setScanState("SEND")}>
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
              <Button className="w-full" primary small onClick={() => setScanState("SEND")}>
                Done
              </Button>
            </div>
          </Drawer>
        )}

        {scanState === "UPDATE_METADATA_PROMPT" && (
          <Drawer anchor="bottom" open={true} parent={parent}>
            <div className="bg-black-tertiary flex flex-col items-center rounded-t p-12">
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
          <div className="flex h-full w-full flex-col items-center justify-between">
            <div className="relative flex aspect-square w-full items-center justify-center bg-white p-12">
              <div className="text-body-secondary absolute top-1/2 left-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-8">
                <LoaderIcon className="animate-spin-slow text-3xl " />
                <div className="text-center">Generating metadata...</div>
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

        {scanState === "RECEIVE" && onSignature && (
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
          narrowMargin ? "py-8" : "py-10"
        )}
      >
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

      {error && (
        <Drawer anchor="bottom" open={true} parent={parent}>
          {/* Shouldn't be a LedgerSigningStatus, just an error message */}
          <LedgerSigningStatus
            message={error ? error : ""}
            status={error ? "error" : undefined}
            confirm={onReject}
          />
        </Drawer>
      )}
    </div>
  )
}
