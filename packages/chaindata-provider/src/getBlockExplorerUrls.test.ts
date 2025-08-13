import { Network } from "./chaindata"
import { getBlockExplorerUrls } from "./getBlockExplorerUrls"

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

describe("getExplorerUrls", () => {
  it("ethereum block number", () => {
    const urls = getBlockExplorerUrls(ETHEREUM, {
      type: "block",
      id: 22957353,
    })

    expect(urls).toContain("https://etherscan.io/block/22957353")
  }),
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
      "https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Frpc.ibp.network%2Fpolkadot#/explorer/query/0xa0fa6f935643cf6b2e72b13a470e0c3724880dcb1298c655c870c0f16aab25d7",
    )
    expect(urls.length).toBe(1) // polkadot.js only
  })

  it("polkadot address", () => {
    const urls = getBlockExplorerUrls(POLKADOT, {
      type: "account",
      address: "13xTKARCtSSTtveDMuTz6s3t9nb1cU1Qasi3iA7BiHobxUdy",
    })

    expect(urls).toContain(
      "https://polkadot.statescan.io/#/accounts/13xTKARCtSSTtveDMuTz6s3t9nb1cU1Qasi3iA7BiHobxUdy",
    )
    expect(urls).toContain(
      "https://polkadot.subscan.io/account/13xTKARCtSSTtveDMuTz6s3t9nb1cU1Qasi3iA7BiHobxUdy",
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
      "https://polkadot.subscan.io/tx/0x45028400dd2c7e96aa307edf9f583f814d6665ed80306e3c9a0055daa18b6dd35873d62600df46b792d582c94581f30b10065174fa51e2ed2098b7446e3063314ea30515bf2daa336d3e3244b2d74d67b3079a4fc0f9a9494ca6388c6d9c54b1b89d2ac00366060400000500003d0f887e609fbfc84f3eba39b873844a42ed0ef99c9f460d9a829d4e2ef5fe7b0784a0e7b027",
    )
    expect(urls.length).toBe(1) // subscan only
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
})
