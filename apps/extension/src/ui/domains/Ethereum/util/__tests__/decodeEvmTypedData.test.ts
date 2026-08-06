import { describe, expect, it } from "vitest"

import { decodeEvmTypedData } from "../decodeEvmTypedData"

const OWNER = "0x1111111111111111111111111111111111111111"
const ATTACKER = "0x00000000000000000000000000000000deadbeef"
const USDC = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
const DAI = "0x6b175474e89094c44da98b954eedeac495271d0f"
const NFT = "0x2222222222222222222222222222222222222222"
const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3"

const MAX_UINT256 = (2n ** 256n - 1n).toString()
const MAX_UINT160 = (2n ** 160n - 1n).toString()

const typedData = (primaryType: string, message: unknown, verifyingContract = PERMIT2) => ({
  primaryType,
  domain: { name: "Test", chainId: 1, verifyingContract },
  message,
})

describe("decodeEvmTypedData", () => {
  it("decodes an ERC-2612 permit against the token it is signed for", () => {
    const decoded = decodeEvmTypedData(
      typedData(
        "Permit",
        { owner: OWNER, spender: ATTACKER, value: MAX_UINT256, nonce: 0, deadline: "1893456000" },
        USDC
      )
    )

    expect(decoded).toEqual({
      type: "permit",
      spender: ATTACKER,
      allowances: [{ token: USDC, amount: 2n ** 256n - 1n }],
      deadline: 1893456000n,
    })
  })

  it("decodes a DAI permit, whose boolean grants an unlimited allowance", () => {
    const decoded = decodeEvmTypedData(
      typedData(
        "Permit",
        { holder: OWNER, spender: ATTACKER, nonce: 0, expiry: 0, allowed: true },
        DAI
      )
    )

    // a DAI permit with expiry 0 never expires
    expect(decoded).toEqual({
      type: "permit",
      spender: ATTACKER,
      allowances: [{ token: DAI, amount: 2n ** 256n - 1n }],
      deadline: undefined,
    })

    expect(
      decodeEvmTypedData(
        typedData("Permit", { holder: OWNER, spender: ATTACKER, allowed: false }, DAI)
      )
    ).toMatchObject({ allowances: [{ token: DAI, amount: 0n }] })
  })

  it("decodes a Permit2 PermitSingle, including the allowance's own expiration", () => {
    const decoded = decodeEvmTypedData(
      typedData("PermitSingle", {
        details: { token: USDC, amount: MAX_UINT160, expiration: "1893456000", nonce: 0 },
        spender: ATTACKER,
        sigDeadline: "1767225600",
      })
    )

    expect(decoded).toEqual({
      type: "permit",
      spender: ATTACKER,
      allowances: [{ token: USDC, amount: 2n ** 160n - 1n, expiration: 1893456000n }],
      deadline: 1767225600n,
    })
  })

  it("decodes every token of a Permit2 PermitBatch", () => {
    const decoded = decodeEvmTypedData(
      typedData("PermitBatch", {
        details: [
          { token: USDC, amount: MAX_UINT160, expiration: "1893456000", nonce: 0 },
          { token: DAI, amount: "1000000", expiration: "1893456000", nonce: 0 },
        ],
        spender: ATTACKER,
        sigDeadline: "1767225600",
      })
    )

    expect(decoded).toMatchObject({
      spender: ATTACKER,
      allowances: [
        { token: USDC, amount: 2n ** 160n - 1n },
        { token: DAI, amount: 1000000n },
      ],
    })
  })

  it("decodes a Permit2 PermitTransferFrom", () => {
    const decoded = decodeEvmTypedData(
      typedData("PermitTransferFrom", {
        permitted: { token: USDC, amount: "5000000" },
        spender: ATTACKER,
        nonce: 1,
        deadline: "1767225600",
      })
    )

    expect(decoded).toEqual({
      type: "permit",
      spender: ATTACKER,
      allowances: [{ token: USDC, amount: 5000000n, expiration: undefined }],
      deadline: 1767225600n,
    })
  })

  it("decodes a Seaport order into what the signer sends and receives", () => {
    const decoded = decodeEvmTypedData(
      typedData("OrderComponents", {
        offerer: OWNER,
        offer: [
          {
            itemType: 2,
            token: NFT,
            identifierOrCriteria: "42",
            startAmount: "1",
            endAmount: "1",
          },
        ],
        consideration: [
          {
            itemType: 0,
            token: "0x0000000000000000000000000000000000000000",
            identifierOrCriteria: "0",
            startAmount: "1000000000000000",
            endAmount: "1000000000000000",
            recipient: ATTACKER,
          },
        ],
        endTime: "1767225600",
      })
    )

    expect(decoded).toEqual({
      type: "order",
      offerer: OWNER,
      offer: [{ token: NFT, identifier: 42n, amount: 1n, isNft: true, recipient: undefined }],
      consideration: [
        {
          token: "0x0000000000000000000000000000000000000000",
          identifier: 0n,
          amount: 1000000000000000n,
          isNft: false,
          recipient: ATTACKER,
        },
      ],
      deadline: 1767225600n,
    })
  })

  it("ignores typed data it cannot decode rather than guessing", () => {
    expect(decodeEvmTypedData(undefined)).toBeUndefined()
    expect(decodeEvmTypedData({ primaryType: "Mail", message: { contents: "hello" } })).toBe(
      undefined
    )
    // a permit without a spender, an amount, or a token tells us nothing about what is granted
    expect(
      decodeEvmTypedData(typedData("Permit", { owner: OWNER, value: MAX_UINT256 }, USDC))
    ).toBeUndefined()
    expect(
      decodeEvmTypedData(typedData("Permit", { owner: OWNER, spender: ATTACKER }, USDC))
    ).toBeUndefined()
    expect(
      decodeEvmTypedData(
        typedData("PermitSingle", { details: { amount: MAX_UINT160 }, spender: ATTACKER })
      )
    ).toBeUndefined()
    expect(
      decodeEvmTypedData(
        typedData("PermitBatch", {
          details: [
            { token: USDC, amount: MAX_UINT160 },
            { token: DAI, amount: "not a number" },
          ],
          spender: ATTACKER,
        })
      )
    ).toBeUndefined()
    expect(
      decodeEvmTypedData(typedData("Permit", { spender: ATTACKER, value: 1 }, "not an address"))
    ).toBeUndefined()
  })
})
