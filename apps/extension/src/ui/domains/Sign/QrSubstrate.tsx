import { AccountJsonQr } from "@core/domains/accounts/types"
import { SignerPayloadJSON, SignerPayloadRaw } from "@core/domains/signing/types"
import { wrapBytes } from "@polkadot/extension-dapp/wrapBytes"
import { QrDisplayPayload } from "@polkadot/react-qr"
import { TypeRegistry } from "@polkadot/types"
import type { HexString } from "@polkadot/util/types"
import { Drawer } from "@talisman/components/Drawer"
import { classNames } from "@talismn/util"
import { ScanQr } from "@ui/domains/Sign/ScanQr"
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

  return (
    <div className={classNames("flex w-full flex-col gap-6", className)}>
      {scanState === "INIT" && (
        <>
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
        </>
      )}

      {scanState === "SEND" && unsigned && (
        <>
          <QrDisplayPayload
            className="rounded-xl bg-white p-12"
            address={account?.address}
            cmd={cmd ?? CMD_MORTAL}
            genesisHash={genesisHash ?? "0x"}
            payload={unsigned}
          />
          <div className="flex w-full gap-12">
            <Button className="w-full" onClick={onReject}>
              Cancel
            </Button>
            <Button className="w-full" primary onClick={() => setScanState("RECEIVE")}>
              Next
            </Button>
          </div>
        </>
      )}

      {scanState === "RECEIVE" && onSignature && (
        <>
          <ScanQr type="signature" onScan={onSignature} size={352} />
          <Button className="w-full" onClick={onReject}>
            Cancel
          </Button>
        </>
      )}
    </div>
  )
}
