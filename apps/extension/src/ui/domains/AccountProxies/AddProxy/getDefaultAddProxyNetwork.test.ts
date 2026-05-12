import { describe, expect, it } from "vitest"

import { getDefaultAddProxyNetwork } from "./getDefaultAddProxyNetwork"

describe("getDefaultAddProxyNetwork", () => {
  it("prefers Bittensor when it is available", () => {
    expect(
      getDefaultAddProxyNetwork([
        { id: "acala", name: "Acala" },
        { id: "bittensor", name: "Bittensor" },
        { id: "polkadot", name: "Polkadot" },
      ])
    ).toEqual({ id: "bittensor", name: "Bittensor" })
  })

  it("keeps the alphabetical default when Bittensor is unavailable", () => {
    expect(
      getDefaultAddProxyNetwork([
        { id: "polkadot", name: "Polkadot" },
        { id: "acala", name: "Acala" },
      ])
    ).toEqual({
      id: "acala",
      name: "Acala",
    })
  })

  it("returns undefined when no compatible networks are available", () => {
    expect(getDefaultAddProxyNetwork([])).toBeUndefined()
  })
})
