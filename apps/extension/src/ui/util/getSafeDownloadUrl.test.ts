import { IPFS_GATEWAY } from "@common/constants"
import { describe, expect, it } from "vitest"

import { getSafeDownloadUrl } from "./getSafeDownloadUrl"

const CID = "bafkreicgj674v7yqduga6angw3d4cvrlnfrgqp2grt53sq64gnpvodjepu"

describe("getSafeDownloadUrl", () => {
  it.each([
    [`ipfs://${CID}/1.png`, `${IPFS_GATEWAY}${CID}/1.png`],
    [`https://gateway.pinata.cloud/ipfs/${CID}`, `${IPFS_GATEWAY}${CID}`],
    [`${IPFS_GATEWAY}${CID}`, `${IPFS_GATEWAY}${CID}`],
  ])("routes %s through our gateway", (url, expected) => {
    expect(getSafeDownloadUrl(url)).toBe(expected)
  })

  it.each(["https://example.com/nft.png", "http://example.com/nft.png", ""])(
    "keeps %j as is",
    (url) => {
      expect(getSafeDownloadUrl(url)).toBe(url)
    }
  )
})
