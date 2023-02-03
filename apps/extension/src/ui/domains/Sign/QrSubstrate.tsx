import { AccountJsonQr } from "@core/domains/accounts/types"
import { SignerPayloadJSON, SignerPayloadRaw } from "@core/domains/signing/types"
import { QrDisplayPayload } from "@polkadot/react-qr"
import { TypeRegistry } from "@polkadot/types"
import type { HexString } from "@polkadot/util/types"
import { Drawer } from "@talisman/components/Drawer"
import { HandRedSmallLogo } from "@talisman/theme/logos"
import { classNames } from "@talismn/util"
import { ScanQr } from "@ui/domains/Sign/ScanQr"
import { ReactElement, useEffect, useState } from "react"
import { Button } from "talisman-ui"

import { LedgerSigningStatus } from "./LedgerSigningStatus"

const CMD_MORTAL = 2

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
  const [unsigned, setUnsigned] = useState<Uint8Array>()

  useEffect(() => {
    if (isRawPayload(payload)) {
      setError("Message signing is not supported for Parity Signer wallets.")
    } else {
      if (payload.signedExtensions) registry.setSignedExtensions(payload.signedExtensions)
      const extrinsicPayload = registry.createType("ExtrinsicPayload", payload, {
        version: payload.version,
      })
      setUnsigned(extrinsicPayload.toU8a())
    }
  }, [payload])

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
          <div className="relative">
            <QrDisplayPayload
              className="rounded-xl bg-white p-12"
              address={account?.address}
              cmd={CMD_MORTAL}
              genesisHash={genesisHash ?? "0x"}
              payload={unsigned}
            />
            <HandRedSmallLogo className="absolute top-1/2 left-1/2 h-[5.2rem] w-[5.2rem] -translate-x-1/2 -translate-y-1/2 bg-white p-1" />
          </div>

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
