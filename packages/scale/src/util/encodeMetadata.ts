import { V14, V15 } from "@polkadot-api/substrate-bindings"

import { magicNumber, metadata as scaleMetadata, toHex } from "../papito"

export const encodeMetadata = ({
  metadata,
  tag,
}: { metadata: V15; tag: "v15" } | { metadata: V14; tag: "v14" }) =>
  toHex(
    scaleMetadata.enc({
      magicNumber,
      metadata: tag === "v15" ? { tag, value: metadata } : { tag, value: metadata },
    }),
  )
