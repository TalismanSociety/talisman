import type { Account } from "@core/domains/keyring/exports"
import type { DotNetwork, EthNetwork } from "@talismn/chaindata-provider"
import { describe, expect, it } from "vitest"

import { isAccountCompatibleWithNetwork } from "../helpers"

const ASSET_HUB_GENESIS = "0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f"
const POLKADOT_GENESIS = "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3"

const dotNetwork = (genesisHash: string) =>
  ({
    platform: "polkadot",
    genesisHash,
    account: "*25519",
    hasCheckMetadataHash: true,
  }) as DotNetwork

const ethereum = { platform: "ethereum", id: "1" } as EthNetwork

const vault: Account = {
  type: "signet",
  address: "5F7LiCA6T4DWUDRQyFAWsRqVwxrJEznUtcw4WNnb5fe6snCH",
  name: "AH Debug 2",
  genesisHash: ASSET_HUB_GENESIS,
  url: "https://signet.talisman.xyz",
  createdAt: 0,
}

describe("isAccountCompatibleWithNetwork", () => {
  it("binds a Signet vault to the network of its genesis hash", () => {
    expect(isAccountCompatibleWithNetwork(dotNetwork(ASSET_HUB_GENESIS), vault)).toBe(true)
    expect(isAccountCompatibleWithNetwork(dotNetwork(POLKADOT_GENESIS), vault)).toBe(false)
    expect(isAccountCompatibleWithNetwork(ethereum, vault)).toBe(false)
  })
})
