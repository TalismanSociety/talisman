import { wrapBytes } from "@polkadot/extension-dapp/wrapBytes"
//import { createSignPayload } from "@polkadot/react-qr/util"
import { TypeRegistry } from "@polkadot/types"
import { u8aConcat, u8aToU8a } from "@polkadot/util"
import { decodeAddress } from "@polkadot/util-crypto"
import { fromHex } from "@talismn/scale"
import { useQuery } from "@tanstack/react-query"
import {
  AccountPolkadotVault,
  isRawPayload,
  SignerPayloadJSON,
  SignerPayloadRaw,
} from "extension-core"
import { FC } from "react"

import {
  POLKADOT_GENESIS_HASH,
  PV_CMD_SIGN_MESSAGE,
  PV_CMD_SIGN_TX,
  PV_CMD_SIGN_TX_WITH_PROOF,
  PV_PREFIX_CRYPTO_SR25519,
  PV_PREFIX_SUBSTRATE,
} from "./constants"
import { QrCode, QrCodeError } from "./QrCode"

export const SignPayloadQrCode: FC<{
  account: AccountPolkadotVault
  payload: SignerPayloadJSON | SignerPayloadRaw
  shortMetadata?: string
}> = ({ account, payload, shortMetadata }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["getQrSignPayload", account.address, JSON.stringify(payload), shortMetadata],
    queryFn: () => getQrSignPayload(account.address, payload, shortMetadata),
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
  })

  if (isLoading) return null
  if (error) return <QrCodeError error={String(error)} />
  return <QrCode data={data} />
}

const registry = new TypeRegistry()

const getQrSignPayload = (
  address: string,
  payload: SignerPayloadJSON | SignerPayloadRaw,
  shortMetadata: string | undefined,
) => {
  if (isRawPayload(payload))
    return u8aConcat(
      PV_PREFIX_SUBSTRATE,
      PV_PREFIX_CRYPTO_SR25519,
      PV_CMD_SIGN_MESSAGE,
      decodeAddress(address),
      wrapBytes(payload.data),
      u8aToU8a(POLKADOT_GENESIS_HASH),
    )

  registry.setSignedExtensions(payload.signedExtensions)
  const extrinsicPayload = registry.createType("ExtrinsicPayload", payload)
  const encodedPayload = extrinsicPayload.toU8a(false)

  return !!shortMetadata && !!payload.metadataHash && payload.mode === 1
    ? u8aConcat(
        PV_PREFIX_SUBSTRATE,
        PV_PREFIX_CRYPTO_SR25519,
        PV_CMD_SIGN_TX_WITH_PROOF,
        decodeAddress(address),
        u8aToU8a(fromHex(shortMetadata)),
        u8aToU8a(encodedPayload),
        u8aToU8a(payload.genesisHash),
      )
    : u8aConcat(
        PV_PREFIX_SUBSTRATE,
        PV_PREFIX_CRYPTO_SR25519,
        PV_CMD_SIGN_TX,
        decodeAddress(address),
        u8aToU8a(encodedPayload),
        u8aToU8a(payload.genesisHash),
      )
}
