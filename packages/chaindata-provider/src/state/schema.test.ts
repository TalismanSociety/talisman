import { describe, expect, it } from "vitest"

import {
  makeChaindata,
  makeDotNetwork,
  makeEthNetwork,
  makeEvmNativeToken,
} from "../__fixtures__/chaindata"
import { DotNetworkSchema, EthNetworkSchema, NetworkSchema } from "../chaindata"
import { parseChaindataFileChunked, parseCustomChaindataChunked } from "./chunkedValidation"
import { ChaindataFileNetworkSchema, ChaindataFileSchema } from "./schema"

describe("ChaindataFileNetworkSchema", () => {
  it("removes ws:// RPCs from a substrate network", () => {
    const result = ChaindataFileNetworkSchema.parse(
      makeDotNetwork({ rpcs: ["ws://cleartext.example:9944", "wss://rpc.polkadot.io"] })
    )

    expect(result.rpcs).toEqual(["wss://rpc.polkadot.io"])
  })

  it("removes http:// RPCs from an EVM network", () => {
    const result = ChaindataFileNetworkSchema.parse(
      makeEthNetwork({ rpcs: ["https://eth.llamarpc.com", "HTTP://cleartext.example"] })
    )

    expect(result.rpcs).toEqual(["https://eth.llamarpc.com"])
  })

  it("keeps a network whose RPCs are all cleartext, with no RPCs", () => {
    const result = ChaindataFileNetworkSchema.parse(
      makeEthNetwork({ rpcs: ["http://cleartext.example"] })
    )

    expect(result.rpcs).toEqual([])
  })

  it("removes cleartext RPCs from loopback hosts too", () => {
    const result = ChaindataFileNetworkSchema.parse(
      makeEthNetwork({ rpcs: ["http://localhost:8545", "http://127.0.0.1:8545"] })
    )

    expect(result.rpcs).toEqual([])
  })

  it("returns a network with only secure RPCs unchanged", () => {
    const network = makeEthNetwork()

    expect(ChaindataFileNetworkSchema.parse(network)).toEqual(NetworkSchema.parse(network))
  })

  it("still rejects RPCs of the wrong protocol", () => {
    expect(
      ChaindataFileNetworkSchema.safeParse(makeDotNetwork({ rpcs: ["ftp://x.example"] })).success
    ).toBe(false)
    expect(
      ChaindataFileNetworkSchema.safeParse(makeEthNetwork({ rpcs: ["not a url"] })).success
    ).toBe(false)
  })
})

describe("cleartext RPCs in a chaindata file", () => {
  const data = makeChaindata({
    networks: [
      makeDotNetwork({ rpcs: ["ws://cleartext.example:9944"] }),
      makeEthNetwork({ rpcs: ["http://cleartext.example", "https://eth.llamarpc.com"] }),
    ],
  })

  it("are removed by ChaindataFileSchema", () => {
    const result = ChaindataFileSchema.parse(data)

    expect(result.networks.map((n) => n.rpcs)).toEqual([[], ["https://eth.llamarpc.com"]])
  })

  it("are removed by the chunked parser", async () => {
    const result = await parseChaindataFileChunked(data)

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.networks.map((n) => n.rpcs)).toEqual([[], ["https://eth.llamarpc.com"]])
  })
})

describe("cleartext RPCs added by the user", () => {
  it("are accepted by the network schemas", () => {
    expect(DotNetworkSchema.parse(makeDotNetwork({ rpcs: ["ws://127.0.0.1:9944"] })).rpcs).toEqual([
      "ws://127.0.0.1:9944",
    ])
    expect(
      EthNetworkSchema.parse(makeEthNetwork({ rpcs: ["http://localhost:8545"] })).rpcs
    ).toEqual(["http://localhost:8545"])
  })

  it("are kept in custom chaindata", async () => {
    const network = makeEthNetwork({ id: "custom", rpcs: ["http://192.168.1.10:8545"] })
    const result = await parseCustomChaindataChunked({
      networks: [network],
      tokens: [makeEvmNativeToken()],
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.networks?.[0]?.rpcs).toEqual(["http://192.168.1.10:8545"])
  })
})
