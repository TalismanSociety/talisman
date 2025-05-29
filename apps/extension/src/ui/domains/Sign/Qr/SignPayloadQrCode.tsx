import { wrapBytes } from "@polkadot/extension-dapp/wrapBytes"
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
import { FC, useMemo } from "react"

import { useSetting } from "@ui/state"

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
  const [embedProof] = useSetting("polkadotVaultSignWithProof")

  const proof = useMemo(() => (embedProof ? shortMetadata : undefined), [embedProof, shortMetadata])

  const { data, isLoading, error } = useQuery({
    queryKey: ["getQrSignPayload", account.address, JSON.stringify(payload), proof],
    queryFn: () => getQrSignPayload(account, payload, proof),
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
  account: AccountPolkadotVault,
  payload: SignerPayloadJSON | SignerPayloadRaw,
  proof: string | undefined,
) => {
  if (isRawPayload(payload))
    return u8aConcat(
      PV_PREFIX_SUBSTRATE,
      PV_PREFIX_CRYPTO_SR25519,
      PV_CMD_SIGN_MESSAGE,
      decodeAddress(account.address),
      wrapBytes(payload.data),
      u8aToU8a(account.genesisHash || POLKADOT_GENESIS_HASH),
    )

  registry.setSignedExtensions(payload.signedExtensions)
  const extrinsicPayload = registry.createType("ExtrinsicPayload", payload)
  const encodedPayload = extrinsicPayload.toU8a(false)

  return !!proof && !!payload.metadataHash && payload.mode === 1
    ? u8aConcat(
        PV_PREFIX_SUBSTRATE,
        PV_PREFIX_CRYPTO_SR25519,
        PV_CMD_SIGN_TX_WITH_PROOF,
        decodeAddress(account.address),
        fromHex(proof),
        u8aToU8a(encodedPayload),
        u8aToU8a(payload.genesisHash),
      )
    : u8aConcat(
        PV_PREFIX_SUBSTRATE,
        PV_PREFIX_CRYPTO_SR25519,
        PV_CMD_SIGN_TX,
        decodeAddress(account.address),
        u8aToU8a(encodedPayload),
        u8aToU8a(payload.genesisHash),
      )
}
