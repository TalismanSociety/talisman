import { describe, expect, it } from "vitest"

import { getTestScaleApi } from "../__fixtures__/chains"
import { getChainInfo } from "./getChainInfo"

describe("getChainInfo", () => {
  it.each([
    [
      "polkadot",
      { specName: "polkadot", specVersion: 2003000, transactionVersion: 26, base58Prefix: 0 },
    ],
    [
      "moonbeam",
      { specName: "moonbeam", specVersion: 4303, transactionVersion: 3, base58Prefix: 1284 },
    ],
    [
      "assethub",
      { specName: "statemint", specVersion: 2003001, transactionVersion: 15, base58Prefix: 0 },
    ],
  ] as const)("reads the runtime version and ss58 prefix of %s", (name, info) => {
    expect(getChainInfo(getTestScaleApi(name).chain)).toEqual(info)
  })
})
