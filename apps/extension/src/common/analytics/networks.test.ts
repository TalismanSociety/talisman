import type { Network } from "@talismn/chaindata-provider"
import { describe, expect, it } from "vitest"

import { savedNetworkId } from "./funds"
import { networkToggledOf } from "./networks"

describe("savedNetworkId", () => {
  it("keeps Talisman's id, and hides a user-added chain id or genesis hash", () => {
    expect(savedNetworkId({ id: "polkadot" }, true)).toBe("polkadot")
    expect(savedNetworkId({ id: "987654321" }, false)).toBe("custom")
    expect(savedNetworkId({ id: `0x${"ab".repeat(32)}` }, false)).toBe("custom")
  })

  it("names a toggled network as custom_network_saved does", () => {
    const network = { id: "987654321", platform: "ethereum", isTestnet: true } as Network
    expect(networkToggledOf(network, false, "settings")).toEqual({
      network_id: "custom",
      platform: "ethereum",
      enabled: false,
      default_enabled: false,
      source: "settings",
    })
  })
})
