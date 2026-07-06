import type { AccountPolkadotVault } from "@core/domains/keyring/exports"
import type { SignerPayloadJSON, SignerPayloadRaw } from "@core/domains/signing/types"
import { isRawPayload } from "@core/util/isJsonPayload"
import { decodeAddress } from "@polkadot/util-crypto"
import { compact } from "@polkadot-api/substrate-bindings"
import { getPjsTxHelper } from "@polkadot-api/tx-utils"
import { mergeUint8 } from "@polkadot-api/utils"
import { fromHex } from "@talismn/scale"
import { u8aConcat, u8aToU8a, u8aWrapBytes } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import { useSetting } from "@ui/state/settings"
import { type FC, useMemo } from "react"

import { useSubstratePayloadMetadata } from "../hooks/useSubstratePayloadMetadata"
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

  // chain metadata is only required for json payloads
  const {
    data: payloadMetadata,
    isLoading: isLoadingMetadata,
    error: metadataError,
  } = useSubstratePayloadMetadata(isRawPayload(payload) ? null : payload)
  const metadataRpc = payloadMetadata?.metadataRpc

  const { data, isLoading, error } = useQuery({
    queryKey: ["getQrSignPayload", account.address, JSON.stringify(payload), proof],
    queryFn: () => getQrSignPayload(account, payload, proof, metadataRpc),
    enabled: isRawPayload(payload) || !!metadataRpc,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
  })

  if (metadataError) return <QrCodeError error={String(metadataError)} />
  if (isLoadingMetadata || isLoading || (!isRawPayload(payload) && !metadataRpc)) return null
  if (error) return <QrCodeError error={String(error)} />
  return <QrCode data={data} />
}

const getQrSignPayload = (
  account: AccountPolkadotVault,
  payload: SignerPayloadJSON | SignerPayloadRaw,
  proof: string | undefined,
  metadataRpc: string | undefined
) => {
  if (isRawPayload(payload))
    return u8aConcat(
      PV_PREFIX_SUBSTRATE,
      PV_PREFIX_CRYPTO_SR25519,
      PV_CMD_SIGN_MESSAGE,
      decodeAddress(account.address),
      u8aWrapBytes(payload.data),
      u8aToU8a(account.genesisHash || POLKADOT_GENESIS_HASH)
    )

  if (!metadataRpc) throw new Error("Missing metadata")

  const { callData, extra, additionalSigned } = getPjsTxHelper(metadataRpc)(payload)
  // same bytes as pjs `ExtrinsicPayload.toU8a(false)`: only the method carries a compact length prefix
  const encodedPayload = mergeUint8([
    compact.enc(callData.length),
    callData,
    extra,
    additionalSigned,
  ])

  return proof && payload.metadataHash && payload.mode === 1
    ? u8aConcat(
        PV_PREFIX_SUBSTRATE,
        PV_PREFIX_CRYPTO_SR25519,
        PV_CMD_SIGN_TX_WITH_PROOF,
        decodeAddress(account.address),
        fromHex(proof),
        u8aToU8a(encodedPayload),
        u8aToU8a(payload.genesisHash)
      )
    : u8aConcat(
        PV_PREFIX_SUBSTRATE,
        PV_PREFIX_CRYPTO_SR25519,
        PV_CMD_SIGN_TX,
        decodeAddress(account.address),
        u8aToU8a(encodedPayload),
        u8aToU8a(payload.genesisHash)
      )
}
