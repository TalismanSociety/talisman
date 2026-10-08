import { IPFS_GATEWAY } from "@common/constants"
import { describe, expect, it } from "vitest"

import { normaliseMetadataUri } from "./normaliseMetadataUri"

const CID_V0 = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"
const CID_V1 = "bafkreicgj674v7yqduga6angw3d4cvrlnfrgqp2grt53sq64gnpvodjepu"

describe("normaliseMetadataUri", () => {
  it.each([
    [`ipfs://${CID_V1}`, `${IPFS_GATEWAY}${CID_V1}`],
    [`ipfs://${CID_V0}/1.json`, `${IPFS_GATEWAY}${CID_V0}/1.json`],
    [`ipfs://ipfs/${CID_V1}`, `${IPFS_GATEWAY}${CID_V1}`],
    [`https://ipfs.io/ipfs/${CID_V1}/meta.json`, `${IPFS_GATEWAY}${CID_V1}/meta.json`],
    [`http://gateway.pinata.cloud/ipfs/${CID_V0}`, `${IPFS_GATEWAY}${CID_V0}`],
    [CID_V0, `${IPFS_GATEWAY}${CID_V0}`],
    [`${CID_V1}/12.json`, `${IPFS_GATEWAY}${CID_V1}/12.json`],
    [`  ipfs://${CID_V1}\n`, `${IPFS_GATEWAY}${CID_V1}`],
  ])("routes the IPFS form %s through the gateway", (raw, expected) => {
    expect(normaliseMetadataUri(raw)).toBe(expected)
  })

  it.each([
    "https://dyndata.chaotic.art/v1/metadata/ahp/158/2407162256",
    "http://example.com/nft/1.json",
  ])("keeps the http(s) URL %s as is", (url) => {
    expect(normaliseMetadataUri(url)).toBe(url)
  })

  it.each([
    "",
    "   ",
    "ipfs://",
    "data:application/json;base64,e30=",
    "ar://abc",
    "/metadata/1.json",
    "1.json",
    "Qmshort",
  ])("rejects %j", (raw) => {
    expect(normaliseMetadataUri(raw)).toBeNull()
  })
})
