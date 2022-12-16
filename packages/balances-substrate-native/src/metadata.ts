import assert from "assert"

import { Codec, HexSink, Src, Ti } from "@subsquid/scale-codec"
import { Metadata } from "@subsquid/substrate-metadata/lib/interfaces"
import * as metadataDefinition from "@subsquid/substrate-metadata/lib/old/definitions/metadata"
import { OldTypeRegistry } from "@subsquid/substrate-metadata/lib/old/typeRegistry"

// TODO: Take from the subsquid codebase (@subsquid/substrate-metadata/src/codec.ts) the logic required
// to build a Metadata object, but then note how the Codec used to decode the metadata can also be used
// to re-encode a bunch of types back into hex.
//
// Try to do this, and then add back the Metadata magic number and version (14) and see if
// you can decode the new metadata _again_ to prove that it was built correctly.
//
// After this, write the mutator function which will take a Metadata object, filter down all of its
// inner fields to only include the ones relevant to the balances, and then send it back to be turned into hex.
//
// Finally, try and decode this minimized metadata and see if you can build a bunch of balances on different chains
// with it!
export function mutateMetadata(
  metadataRpc: string,
  mutator: (metadata: Metadata) => Metadata | null
): `0x${string}` | null {
  // decode the metadata
  const metadata = decodeMetadata(metadataRpc)

  // take note of the metadata version (we'll need this when we reencode the metadata)
  const version = parseInt(metadata.__kind.replace(/^V/, ""), 10)

  // apply the metadata mutations
  const mutated = mutator(metadata)

  // short-circuit metadata which the mutator function didn't like
  if (mutated === null) return null

  // create a sink to store our encoded metadata output
  const sink = new HexSink()

  // write the magic number
  sink.u32(0x6174656d)

  // write the metadata version
  sink.u8(version)

  // write the encoded metadata
  codec.encode(versions[version - 9], mutated.value, sink)

  // send the result back to the caller
  return sink.toHex() as `0x${string}`
}

/**
 *
 *
 *
 *
 * The code below is copy-pasted from @subsquid/substrate-metadata/src/codec.ts
 * It does exactly what we need for decoding metadata, but in order to re-encode
 * the metadata again we need access to the `codec` variable, which is not exported
 * from the subsquid package.
 *
 * At the time of copy-pasting, the @subsquid/substrate-metadata package was
 * at version 2.1.2.
 *
 *
 *
 *
 */

/* code is copy-pasted, don't bother linting it :) */
/* eslint-disable */

const { codec, versions } = createScaleCodec()

export function decodeMetadata(data: string | Uint8Array): Metadata {
  if (typeof data == "string") {
    data = Buffer.from(data.slice(2), "hex")
  }
  let src = new Src(data)

  let magic = src.u32()
  assert(magic === 0x6174656d, "No magic number 0x6174656d at the start of data")

  let version = src.u8()
  assert(9 <= version && version < 15, "Invalid metadata version")

  // See https://github.com/polkadot-js/api/commit/a9211690be6b68ad6c6dad7852f1665cadcfa5b2
  // for why try-catch and version decoding stuff is here
  try {
    return decode(version, src)
  } catch (e: any) {
    if (version != 9) throw e
    try {
      src = new Src(data)
      src.u32()
      src.u8()
      return decode(10, src)
    } catch (anotherError: any) {
      throw e
    }
  }
}

function decode(version: Ti, src: Src): Metadata {
  let metadata = codec.decode(versions[version - 9], src)
  src.assertEOF()
  return {
    __kind: `V${version}` as any,
    value: metadata,
  }
}

function createScaleCodec(): { codec: Codec; versions: Ti[] } {
  let registry = new OldTypeRegistry(metadataDefinition)
  let versions: Ti[] = new Array(6)
  for (let i = 9; i < 15; i++) {
    versions[i - 9] = registry.use(`MetadataV${i}`)
  }
  return {
    codec: new Codec(registry.getTypes()),
    versions,
  }
}
