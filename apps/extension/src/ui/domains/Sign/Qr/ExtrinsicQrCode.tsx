import { isRawPayload } from "@extension/core"
import { AccountJsonQr } from "@extension/core"
import { SignerPayloadJSON, SignerPayloadRaw } from "@extension/core"
import { wrapBytes } from "@polkadot/extension-dapp/wrapBytes"
import { createSignPayload } from "@polkadot/react-qr/util"
import { TypeRegistry } from "@polkadot/types"
import { useQuery } from "@tanstack/react-query"
import useChain from "@ui/hooks/useChain"

import { QrCode, QrCodeError } from "./QrCode"

const CMD_SIGN_TX = 0
const CMD_SIGN_TX_HASH = 1
const CMD_IMMORTAL = 2
const CMD_SIGN_MESSAGE = 3
type Command =
  | typeof CMD_SIGN_TX
  | typeof CMD_SIGN_TX_HASH
  | typeof CMD_IMMORTAL
  | typeof CMD_SIGN_MESSAGE

const registry = new TypeRegistry()

type Props = {
  account: AccountJsonQr
  genesisHash?: string
  payload: SignerPayloadJSON | SignerPayloadRaw
}

export const ExtrinsicQrCode = ({ account, genesisHash, payload }: Props) => {
  const polkadot = useChain("polkadot")

  const { data, isLoading, error } = useQuery({
    queryKey: ["extrinsicQr", JSON.stringify(payload), genesisHash ?? polkadot?.genesisHash],
    queryFn: () => {
      const { cmd, unsigned }: { cmd: Command; unsigned: Uint8Array } = (() => {
        if (isRawPayload(payload))
          return { cmd: CMD_SIGN_MESSAGE, unsigned: wrapBytes(payload.data) }

        if (payload.signedExtensions) registry.setSignedExtensions(payload.signedExtensions)
        const { version } = payload
        const extrinsicPayload = registry.createType("ExtrinsicPayload", payload, { version })
        const cmd = extrinsicPayload.era?.isImmortalEra ? CMD_IMMORTAL : CMD_SIGN_TX
        return { cmd, unsigned: extrinsicPayload.toU8a() }
      })()

      if (cmd === CMD_SIGN_MESSAGE && !genesisHash) {
        // genesisHash will be either the chain genesisHash for the tx
        // (which is undefined for CMD_SIGN_MESSAGE txs)
        // or it will be the signer account genesisHash
        // (which is undefined for accounts which can be used on any chain)
        //
        // we can't construct a valid qr code without -something- for the genesisHash
        // so: for CMD_SIGN_MESSAGE txs on accounts which work for any chain,
        // let's just sub in the polkadot genesisHash which should be present on the device
        // because the polkadot network exists on parity signer & parity vault by default
        genesisHash = polkadot?.genesisHash ?? undefined
      }

      return unsigned && account
        ? createSignPayload(account.address, cmd, unsigned, genesisHash ?? new Uint8Array([0]))
        : undefined
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
  })

  if (isLoading) return null
  if (error) return <QrCodeError error={String(error)} />
  return <QrCode data={data} />
}
