import { compact, u32 } from "@polkadot-api/substrate-bindings"
import { fromHex, V14, V15 } from "@talismn/scale"
import { SignerPayloadJSON } from "extension-core"
import { log } from "extension-shared"

type SignedExtensionValue = {
  extra: Uint8Array
  additionalSigned: Uint8Array
}

type PjsPayloadSignedExtensionExtractor = (payload: SignerPayloadJSON) => SignedExtensionValue

const CheckNonZeroSender: PjsPayloadSignedExtensionExtractor = () => ({
  extra: new Uint8Array(),
  additionalSigned: new Uint8Array(),
})

const CheckSpecVersion: PjsPayloadSignedExtensionExtractor = ({ specVersion }) => ({
  extra: new Uint8Array(),
  additionalSigned: fromHex(specVersion),
})

const CheckTxVersion: PjsPayloadSignedExtensionExtractor = ({ transactionVersion }) => ({
  extra: new Uint8Array(),
  additionalSigned: fromHex(transactionVersion),
})

const CheckGenesis: PjsPayloadSignedExtensionExtractor = ({ genesisHash }) => ({
  extra: new Uint8Array(),
  additionalSigned: fromHex(genesisHash),
})

const CheckMortality: PjsPayloadSignedExtensionExtractor = ({ era, blockHash }) => ({
  extra: fromHex(era),
  additionalSigned: fromHex(blockHash),
})

const CheckNonce: PjsPayloadSignedExtensionExtractor = ({ nonce }) => ({
  extra: compact.enc(u32.dec(nonce)),
  additionalSigned: new Uint8Array(),
})

const CheckWeight: PjsPayloadSignedExtensionExtractor = () => ({
  extra: new Uint8Array(),
  additionalSigned: new Uint8Array(),
})

const ChargeTransactionPayment: PjsPayloadSignedExtensionExtractor = () => ({
  extra: new Uint8Array(),
  additionalSigned: new Uint8Array(),
})

const PrevalidateAttests: PjsPayloadSignedExtensionExtractor = () => ({
  extra: new Uint8Array(),
  additionalSigned: new Uint8Array(),
})

const CheckMetadataHash: PjsPayloadSignedExtensionExtractor = () => ({
  extra: Uint8Array.from([0]),
  additionalSigned: Uint8Array.from([0]),
})

// const ChargeAssetTxPayment: PjsPayloadSignedExtensionExtractor = ({ tip, assetId }) => ({
//   extra: Struct({
//     tip: compact,
//     asset: Option(Bytes(Infinity)),
//   }).enc({ tip: u128.dec(tip), asset: assetId ? Enum(""). : { None: null } }),
//   additionalSigned: new Uint8Array(),
// })

export const PayloadSignedExtensions: Record<string, PjsPayloadSignedExtensionExtractor> = {
  CheckNonZeroSender,
  CheckSpecVersion,
  CheckTxVersion,
  CheckGenesis,
  CheckMortality,
  CheckNonce,
  CheckWeight,
  ChargeTransactionPayment,
  PrevalidateAttests,
  CheckMetadataHash,
  // ChargeAssetTxPayment,
}

export const getSignedExtensionValues = (
  payload: SignerPayloadJSON,
  metadata: V14 | V15
): { extra: Uint8Array[]; additionalSigned: Uint8Array[] } => {
  const extra: Uint8Array[] = []
  const additionalSigned: Uint8Array[] = []

  for (const signedExtension of payload.signedExtensions) {
    const metaSignedExt = metadata.extrinsic.signedExtensions.find(
      (ext) => ext.identifier === signedExtension
    )

    if (!metaSignedExt) {
      log.warn("Unknown signed extension", { signedExtension })
      extra.push(new Uint8Array())
      additionalSigned.push(new Uint8Array())
      continue
    }

    const extractor = PayloadSignedExtensions[signedExtension]
    if (!extractor) {
      log.warn("Unsupported signed extension", { signedExtension })
      extra.push(new Uint8Array())
      additionalSigned.push(new Uint8Array())
      continue
    }

    const { extra: extraEntry, additionalSigned: additionalSignedEntry } = extractor(payload)

    extra.push(extraEntry)
    additionalSigned.push(additionalSignedEntry)
  }

  // console.log("[sapi] signed ext", { payload, metadata, extra, additionalSigned })

  return { extra, additionalSigned }
}
