import {
  getDynamicBuilder,
  MetadataLookup,
} from "@polkadot-api/metadata-builders"
import { _void } from "@polkadot-api/substrate-bindings"
import {
  ChargeAssetTxPayment,
  ChargeTransactionPayment,
  CheckMortality,
} from "./user"
import {
  CheckGenesis,
  CheckMetadataHash,
  CheckNonce,
  CheckSpecVersion,
  CheckTxVersion,
} from "./chain"
// [talisman] "@/types" upstream path alias rewritten as a relative import;
// CustomSignedExtensions + SignerPayloadJSON added
import { CustomSignedExtensions, SignerPayloadJSON, TxData } from "../types"
import { SignedExtension } from "./internal-types"
// [talisman] empty + signedExtension added for unknown Option-typed extensions
import { EMPTY_SIGNED_EXTENSION, empty, signedExtension } from "./utils"
import { mergeUint8 } from "@polkadot-api/utils"

export const getSignedExtensionParts = (
  lookup: MetadataLookup,
  dynamicBuilder: ReturnType<typeof getDynamicBuilder>,
  data: TxData,
  // [talisman] caller-provided encoders for signed extensions unknown to this library
  customSignedExtensions?: CustomSignedExtensions,
  payload?: SignerPayloadJSON,
) => {
  const { tip, mortality, genesisHash, nonce, asset, metadataHash } = data
  const signedExtensions = lookup.metadata.extrinsic.signedExtensions[0].map(
    ({ identifier, type, additionalSigned }): SignedExtension => {
      switch (identifier) {
        case "CheckGenesis":
          return CheckGenesis(genesisHash)
        case "CheckMetadataHash":
          return CheckMetadataHash(metadataHash)
        case "CheckNonce":
          return CheckNonce(nonce)
        case "CheckSpecVersion":
          return CheckSpecVersion(lookup)
        case "ChargeAssetTxPayment":
          return ChargeAssetTxPayment(tip, asset)
        case "ChargeTransactionPayment":
          return ChargeTransactionPayment(tip)
        case "CheckMortality":
          return CheckMortality(mortality)
        case "CheckTxVersion":
          return CheckTxVersion(lookup)
      }

      // [talisman] caller-provided encoders for signed extensions unknown to this library
      const custom = payload && customSignedExtensions?.[identifier]
      if (custom)
        return custom(
          payload as SignerPayloadJSON & Record<string, unknown>,
          lookup.metadata,
        )

      // [talisman] gracefully encode `None` for unknown Option-typed signed extensions
      if (
        lookup(type).type === "option" &&
        dynamicBuilder.buildDefinition(additionalSigned) === _void
      )
        return signedExtension(new Uint8Array([0]), empty)

      if (
        dynamicBuilder.buildDefinition(type) === _void &&
        dynamicBuilder.buildDefinition(additionalSigned) === _void
      )
        return EMPTY_SIGNED_EXTENSION

      throw new Error(`Unsupported signed-extension: ${identifier}`)
    },
  )

  const signedExtensionsRecord = Object.fromEntries(
    lookup.metadata.extrinsic.signedExtensions[0].map(({ identifier }, idx) => [
      identifier,
      { identifier, ...signedExtensions[idx] },
    ]),
  )

  let extraParts: Uint8Array[] = []
  let additionalSignedParts: Uint8Array[] = []
  lookup.metadata.extrinsic.signedExtensions[0].map(({ identifier }) => {
    const signedExtension = signedExtensionsRecord[identifier]
    if (!signedExtension)
      throw new Error(`Missing ${identifier} signed extension`)
    extraParts.push(signedExtension.value)
    additionalSignedParts.push(signedExtension.additionalSigned)
  })

  const extra = mergeUint8(extraParts)
  const additionalSigned = mergeUint8(additionalSignedParts)

  return { extra, additionalSigned }
}
