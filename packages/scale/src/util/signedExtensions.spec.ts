import { readFileSync } from "node:fs"
import path from "node:path"
import { gunzipSync } from "node:zlib"
import { describe, expect, test } from "vitest"

import type { UnifiedMetadata } from "../papito"
import { parseMetadataRpc } from "./parseMetadataRpc"
import { getSignedExtensions, hasSignedExtension } from "./signedExtensions"

const repoRoot = path.resolve(import.meta.dirname, "../../../..")

const polkadotV15 = parseMetadataRpc(
  `0x${gunzipSync(
    readFileSync(
      path.join(repoRoot, "apps/extension/tests/fixtures/polkadot-metadata-v15.scale.gz")
    )
  ).toString("hex")}`
).unifiedMetadata

const polkadotV16 = parseMetadataRpc(
  `0x${readFileSync(path.join(repoRoot, ".papi/scale/polkadot.scale")).toString("hex")}`
).unifiedMetadata

const POLKADOT_SIGNED_EXTENSIONS = [
  "AuthorizeCall",
  "CheckNonZeroSender",
  "CheckSpecVersion",
  "CheckTxVersion",
  "CheckGenesis",
  "CheckMortality",
  "CheckNonce",
  "CheckWeight",
  "ChargeTransactionPayment",
  "PrevalidateAttests",
  "CheckMetadataHash",
]

describe("signed extensions", () => {
  test.each([
    ["v15", polkadotV15],
    ["v16", polkadotV16],
  ])("lists polkadot %s extensions in payload order", (_, metadata) => {
    expect(getSignedExtensions(metadata).map(({ identifier }) => identifier)).toEqual(
      POLKADOT_SIGNED_EXTENSIONS
    )
    expect(hasSignedExtension(metadata, "CheckMetadataHash")).toBe(true)
    expect(hasSignedExtension(metadata, "CheckAppId")).toBe(false)
  })

  test("ignores extensions that only exist in other extension versions", () => {
    const [checkNonce] = getSignedExtensions(polkadotV16).filter(
      ({ identifier }) => identifier === "CheckNonce"
    )
    const generalOnly = { ...checkNonce, identifier: "GeneralOnly" }
    const metadata: UnifiedMetadata = {
      ...polkadotV16,
      extrinsic: {
        ...polkadotV16.extrinsic,
        extensions: { ...polkadotV16.extrinsic.extensions, GeneralOnly: generalOnly },
        extensionsByVersion: {
          ...polkadotV16.extrinsic.extensionsByVersion,
          1: [generalOnly],
        },
      },
    }

    expect(getSignedExtensions(metadata).map(({ identifier }) => identifier)).toEqual(
      POLKADOT_SIGNED_EXTENSIONS
    )
    expect(hasSignedExtension(metadata, "GeneralOnly")).toBe(false)
  })
})
