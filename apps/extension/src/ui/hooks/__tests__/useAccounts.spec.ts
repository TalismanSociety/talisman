import type { AccountJsonAny } from "@core/domains/accounts/types"
import { renderHook } from "@testing-library/react"

import { useAccounts } from "../useAccounts"

// Mock the accounts api call
jest.mock("@ui/api", () => {
  return {
    api: {
      accountsSubscribe: jest
        .fn()
        .mockImplementation((cb: (accounts: AccountJsonAny[]) => void) => {
          cb([
            {
              address: "testAddress",
              genesisHash: "testGenesisHash",
              isExternal: false,
              isHardware: false,
              name: "testAccount",
              suri: "a very good mnemonic which actually doesn't have twelve words",
              type: "sr25519",
            },
          ])
          return () => undefined
        }),
    },
  }
})

test("Can get accounts", async () => {
  const { result } = renderHook(() => useAccounts())
  expect(result.current.length).toBe(1)
  expect(result.current[0].address).toBe("testAddress")
})
