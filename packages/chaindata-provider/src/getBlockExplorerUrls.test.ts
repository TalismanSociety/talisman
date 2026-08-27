import { describe, expect, it } from "vitest"
import type { Network } from "./chaindata"
import { getBlockExplorerLabel, getBlockExplorerUrls } from "./getBlockExplorerUrls"

const ETHEREUM = {
  id: "ethereum",
  blockExplorerUrls: [
    "https://etherscan.io",
    "https://ethplorer.io",
    "https://eth.blockscout.com/",
  ],
} as unknown as Network

const POLKADOT = {
  id: "polkadot",
  blockExplorerUrls: [
    "https://polkadot.subscan.io",
    "https://polkadot.js.org/apps/?rpc={RPC_URL}#/accounts",
    "https://polkadot.statescan.io/",
  ],
  rpcs: ["wss://rpc.ibp.network/polkadot", "wss://polkadot-rpc.dwellir.com"],
} as unknown as Network

const SOLANA = {
  id: "solana-testnet",
  blockExplorerUrls: [
    "https://explorer.solana.com/?cluster=testnet",
    "https://solscan.io?cluster=testnet",
  ],
} as unknown as Network

const BITTENSOR = {
  id: "bittensor",
  blockExplorerUrls: ["https://taostats.io"],
} as unknown as Network

const EXPLORER_WITH_BASE_PATH = {
  id: "bittensor",
  blockExplorerUrls: ["https://bittensor.ai/chain"],
} as unknown as Network

const EXPLORER_WITH_BASE_PATH_TRAILING_SLASH = {
  id: "bittensor",
  blockExplorerUrls: ["https://bittensor.ai/chain/"],
} as unknown as Network

const EXPLORER_BITTENSOR_AI = {
  id: "bittensor",
  blockExplorerUrls: ["https://explorer.bittensor.ai"],
} as unknown as Network

const BITTENSOR_BOTH_EXPLORERS = {
  id: "bittensor",
  blockExplorerUrls: ["https://taostats.io", "https://bittensor.ai/chain"],
} as unknown as Network

const BITCOIN = {
  id: "bitcoin",
  blockExplorerUrls: ["https://mempool.space"],
} as unknown as Network

const BIP84_ZPUB =
  "zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs"

describe("getExplorerUrls", () => {
  it("ethereum block number", () => {
    const urls = getBlockExplorerUrls(ETHEREUM, {
      type: "block",
      id: 22957353,
    })

    expect(urls).toContain("https://etherscan.io/block/22957353")
  })

  it("polkadot block number", () => {
    const urls = getBlockExplorerUrls(POLKADOT, {
      type: "block",
      id: 26955482,
    })

    expect(urls).toContain("https://polkadot.subscan.io/block/26955482")
    expect(urls).toContain("https://polkadot.statescan.io/#/blocks/26955482")
    expect(urls.length).toBe(2)
  })

  it("polkadot block hash", () => {
    const urls = getBlockExplorerUrls(POLKADOT, {
      type: "block",
      id: "0xa0fa6f935643cf6b2e72b13a470e0c3724880dcb1298c655c870c0f16aab25d7",
    })

    expect(urls).toContain(
      "https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Frpc.ibp.network%2Fpolkadot#/explorer/query/0xa0fa6f935643cf6b2e72b13a470e0c3724880dcb1298c655c870c0f16aab25d7"
    )
    expect(urls.length).toBe(1) // polkadot.js only
  })

  it("polkadot address", () => {
    const urls = getBlockExplorerUrls(POLKADOT, {
      type: "account",
      address: "13xTKARCtSSTtveDMuTz6s3t9nb1cU1Qasi3iA7BiHobxUdy",
    })

    expect(urls).toContain(
      "https://polkadot.statescan.io/#/accounts/13xTKARCtSSTtveDMuTz6s3t9nb1cU1Qasi3iA7BiHobxUdy"
    )
    expect(urls).toContain(
      "https://polkadot.subscan.io/account/13xTKARCtSSTtveDMuTz6s3t9nb1cU1Qasi3iA7BiHobxUdy"
    )
    expect(urls.length).toBe(2) // polkadot.js does not provide an address page
  })

  it("polkadot extrinsic", () => {
    const urls = getBlockExplorerUrls(POLKADOT, {
      type: "extrinsic",
      blockNumber: 26955974,
      extrinsicIndex: 1,
    })

    expect(urls).toContain("https://polkadot.statescan.io/#/extrinsics/26955974-1")
    expect(urls).toContain("https://polkadot.subscan.io/extrinsic/26955974-1")
  })
  it("polkadot extrinsic unknown", () => {
    const urls = getBlockExplorerUrls(POLKADOT, {
      type: "extrinsic-unknown",
      hash: "0x45028400dd2c7e96aa307edf9f583f814d6665ed80306e3c9a0055daa18b6dd35873d62600df46b792d582c94581f30b10065174fa51e2ed2098b7446e3063314ea30515bf2daa336d3e3244b2d74d67b3079a4fc0f9a9494ca6388c6d9c54b1b89d2ac00366060400000500003d0f887e609fbfc84f3eba39b873844a42ed0ef99c9f460d9a829d4e2ef5fe7b0784a0e7b027",
    })

    expect(urls).toContain(
      "https://polkadot.subscan.io/extrinsic/0x45028400dd2c7e96aa307edf9f583f814d6665ed80306e3c9a0055daa18b6dd35873d62600df46b792d582c94581f30b10065174fa51e2ed2098b7446e3063314ea30515bf2daa336d3e3244b2d74d67b3079a4fc0f9a9494ca6388c6d9c54b1b89d2ac00366060400000500003d0f887e609fbfc84f3eba39b873844a42ed0ef99c9f460d9a829d4e2ef5fe7b0784a0e7b027"
    )
    expect(urls.length).toBe(1) // subscan only
  })

  it("polkadot transaction", () => {
    const urls = getBlockExplorerUrls(POLKADOT, {
      type: "transaction",
      id: "0x8d69d9c2b6b1b1f4e1e01bdd4b132a4a1c00e4e08e0e11e8d8c631aa1a677a41",
    })

    expect(urls).toContain(
      "https://polkadot.subscan.io/extrinsic/0x8d69d9c2b6b1b1f4e1e01bdd4b132a4a1c00e4e08e0e11e8d8c631aa1a677a41"
    )
    expect(urls).toContain(
      "https://polkadot.statescan.io/#/extrinsics/0x8d69d9c2b6b1b1f4e1e01bdd4b132a4a1c00e4e08e0e11e8d8c631aa1a677a41"
    )
    expect(urls.length).toBe(2) // polkadot.js does not support tx hash
  })

  it("bittensor blocks", () => {
    const urls = getBlockExplorerUrls(BITTENSOR, {
      type: "block",
      id: 6036407,
    })

    expect(urls).toContain("https://taostats.io/block/6036407/extrinsics")
  })

  it("solana slots", () => {
    const urls = getBlockExplorerUrls(SOLANA, {
      type: "block",
      id: 346470596,
    })

    expect(urls).toContain("https://explorer.solana.com/block/346470596?cluster=testnet")
    expect(urls).toContain("https://solscan.io/block/346470596?cluster=testnet")
  })

  it("bittensor extrinsic", () => {
    const urls = getBlockExplorerUrls(BITTENSOR, {
      type: "extrinsic",
      blockNumber: 6035238,
      extrinsicIndex: 12,
    })

    expect(urls).toContain("https://taostats.io/extrinsic/6035238-0012")
  })

  it("explorer with base path - account", () => {
    const urls = getBlockExplorerUrls(EXPLORER_WITH_BASE_PATH, {
      type: "account",
      address: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
    })

    expect(urls).toContain(
      "https://bittensor.ai/chain/account/5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"
    )
  })

  it("explorer with base path - block", () => {
    const urls = getBlockExplorerUrls(EXPLORER_WITH_BASE_PATH, {
      type: "block",
      id: 6036407,
    })

    expect(urls).toContain("https://bittensor.ai/chain/block/6036407")
  })

  it("explorer with base path - transaction", () => {
    const urls = getBlockExplorerUrls(EXPLORER_WITH_BASE_PATH, {
      type: "transaction",
      id: "0xabc123",
    })

    expect(urls).toContain("https://bittensor.ai/chain/tx/0xabc123")
  })

  it("explorer with base path - extrinsic", () => {
    const urls = getBlockExplorerUrls(EXPLORER_WITH_BASE_PATH, {
      type: "extrinsic",
      blockNumber: 6035238,
      extrinsicIndex: 12,
    })

    expect(urls).toContain("https://bittensor.ai/chain/extrinsic/6035238-12")
  })

  it("explorer with base path and trailing slash - account", () => {
    const urls = getBlockExplorerUrls(EXPLORER_WITH_BASE_PATH_TRAILING_SLASH, {
      type: "account",
      address: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
    })

    expect(urls).toContain(
      "https://bittensor.ai/chain/account/5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"
    )
  })

  it("explorer with base path and trailing slash - block", () => {
    const urls = getBlockExplorerUrls(EXPLORER_WITH_BASE_PATH_TRAILING_SLASH, {
      type: "block",
      id: 6036407,
    })

    expect(urls).toContain("https://bittensor.ai/chain/block/6036407")
  })

  it("explorer with base path and trailing slash - extrinsic", () => {
    const urls = getBlockExplorerUrls(EXPLORER_WITH_BASE_PATH_TRAILING_SLASH, {
      type: "extrinsic",
      blockNumber: 6035238,
      extrinsicIndex: 12,
    })

    expect(urls).toContain("https://bittensor.ai/chain/extrinsic/6035238-12")
  })

  it("explorer.bittensor.ai - account", () => {
    const urls = getBlockExplorerUrls(EXPLORER_BITTENSOR_AI, {
      type: "account",
      address: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
    })

    expect(urls).toContain(
      "https://explorer.bittensor.ai/account/5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"
    )
  })

  it("explorer.bittensor.ai - block", () => {
    const urls = getBlockExplorerUrls(EXPLORER_BITTENSOR_AI, {
      type: "block",
      id: 6036407,
    })

    expect(urls).toContain("https://explorer.bittensor.ai/block/6036407")
  })

  it("explorer.bittensor.ai - extrinsic", () => {
    const urls = getBlockExplorerUrls(EXPLORER_BITTENSOR_AI, {
      type: "extrinsic",
      blockNumber: 6035238,
      extrinsicIndex: 12,
    })

    expect(urls).toContain("https://explorer.bittensor.ai/extrinsic/6035238-12")
  })

  it("explorer.bittensor.ai - transaction", () => {
    const urls = getBlockExplorerUrls(EXPLORER_BITTENSOR_AI, {
      type: "transaction",
      id: "0xabc123",
    })

    expect(urls).toContain("https://explorer.bittensor.ai/tx/0xabc123")
  })

  it("explorer.bittensor.ai - address (contract)", () => {
    const urls = getBlockExplorerUrls(EXPLORER_BITTENSOR_AI, {
      type: "address",
      address: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
    })

    expect(urls).toContain(
      "https://explorer.bittensor.ai/account/5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"
    )
  })

  it("bittensor with both explorers - block", () => {
    const urls = getBlockExplorerUrls(BITTENSOR_BOTH_EXPLORERS, {
      type: "block",
      id: 6036407,
    })

    expect(urls).toContain("https://taostats.io/block/6036407/extrinsics")
    expect(urls).toContain("https://bittensor.ai/chain/block/6036407")
    expect(urls.length).toBe(2)
  })

  it("bittensor with both explorers - account", () => {
    const urls = getBlockExplorerUrls(BITTENSOR_BOTH_EXPLORERS, {
      type: "account",
      address: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
    })

    expect(urls).toContain(
      "https://taostats.io/account/5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"
    )
    expect(urls).toContain(
      "https://bittensor.ai/chain/account/5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"
    )
    expect(urls.length).toBe(2)
  })

  it("bittensor with both explorers - extrinsic", () => {
    const urls = getBlockExplorerUrls(BITTENSOR_BOTH_EXPLORERS, {
      type: "extrinsic",
      blockNumber: 6035238,
      extrinsicIndex: 12,
    })

    expect(urls).toContain("https://taostats.io/extrinsic/6035238-0012")
    expect(urls).toContain("https://bittensor.ai/chain/extrinsic/6035238-12")
    expect(urls.length).toBe(2)
  })

  it("bitcoin address", () => {
    const urls = getBlockExplorerUrls(BITCOIN, {
      type: "address",
      address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
    })

    expect(urls).toEqual([
      "https://mempool.space/address/bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
    ])
  })

  it("bitcoin xpub never produces an explorer link", () => {
    expect(getBlockExplorerUrls(BITCOIN, { type: "address", address: BIP84_ZPUB })).toEqual([])
    expect(getBlockExplorerUrls(BITCOIN, { type: "account", address: BIP84_ZPUB })).toEqual([])
  })

  it("bitcoin canonical xpub never produces an explorer link", () => {
    const CANONICAL_XPUB =
      "xpub6CatWdiZiodmUeTDp8LT5or8nmbKNcuyvz7WyksVFkKB4RHwCD3XyuvPEbvqAQY3rAPshWcMLoP2fMFMKHPJ4ZeZXYVUhLv1VMrjPC7PW6V"
    expect(getBlockExplorerUrls(BITCOIN, { type: "address", address: CANONICAL_XPUB })).toEqual([])
  })

  it("bitcoin transaction", () => {
    const urls = getBlockExplorerUrls(BITCOIN, {
      type: "transaction",
      id: "7e8eb27b7d4b1e5f4d5d1e5f4d5d1e5f4d5d1e5f4d5d1e5f4d5d1e5f4d5d1e5f",
    })

    expect(urls[0]).toBe(
      "https://mempool.space/tx/7e8eb27b7d4b1e5f4d5d1e5f4d5d1e5f4d5d1e5f4d5d1e5f4d5d1e5f4d5d1e5f"
    )
  })
})

describe("getBlockExplorerLabel", () => {
  it("returns Bittensor.ai for explorer.bittensor.ai explorer", () => {
    expect(getBlockExplorerLabel("https://explorer.bittensor.ai")).toBe("Bittensor.ai")
  })

  it("returns Bittensor.ai for bittensor.ai explorer", () => {
    expect(getBlockExplorerLabel("https://bittensor.ai/chain")).toBe("Bittensor.ai")
  })

  it("returns Polkadot.js for polkadot.js.org explorer", () => {
    expect(getBlockExplorerLabel("https://polkadot.js.org/apps")).toBe("Polkadot.js")
  })

  it("returns startCase hostname for standard explorers", () => {
    expect(getBlockExplorerLabel("https://etherscan.io")).toBe("Etherscan")
    expect(getBlockExplorerLabel("https://taostats.io")).toBe("Taostats")
  })
})
