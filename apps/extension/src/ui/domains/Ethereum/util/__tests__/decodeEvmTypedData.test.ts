import { describe, expect, it } from "vitest"

import { decodeEvmTypedData } from "../decodeEvmTypedData"

const OWNER = "0x1111111111111111111111111111111111111111"
const COUNTERPARTY = "0x00000000000000000000000000000000deadbeef"
const USDC = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
const DAI = "0x6b175474e89094c44da98b954eedeac495271d0f"
const NFT = "0x2222222222222222222222222222222222222222"
const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3"

const MAX_UINT256 = (2n ** 256n - 1n).toString()
const MAX_UINT160 = (2n ** 160n - 1n).toString()

// the struct definitions dapps send alongside the message, which decide what actually gets signed
const TYPES: Record<string, { name: string; type: string }[]> = {
  Permit: [
    { name: "owner", type: "address" },
    { name: "spender", type: "address" },
    { name: "value", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
  DaiPermit: [
    { name: "holder", type: "address" },
    { name: "spender", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "expiry", type: "uint256" },
    { name: "allowed", type: "bool" },
  ],
  PermitSingle: [
    { name: "details", type: "PermitDetails" },
    { name: "spender", type: "address" },
    { name: "sigDeadline", type: "uint256" },
  ],
  PermitTransferFrom: [
    { name: "permitted", type: "TokenPermissions" },
    { name: "spender", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
  OrderComponents: [
    { name: "offerer", type: "address" },
    { name: "zone", type: "address" },
    { name: "offer", type: "OfferItem[]" },
    { name: "consideration", type: "ConsiderationItem[]" },
    { name: "orderType", type: "uint8" },
    { name: "startTime", type: "uint256" },
    { name: "endTime", type: "uint256" },
    { name: "zoneHash", type: "bytes32" },
    { name: "salt", type: "uint256" },
    { name: "conduitKey", type: "bytes32" },
    { name: "counter", type: "uint256" },
  ],
  PermitDetails: [
    { name: "token", type: "address" },
    { name: "amount", type: "uint160" },
    { name: "expiration", type: "uint48" },
    { name: "nonce", type: "uint48" },
  ],
  TokenPermissions: [
    { name: "token", type: "address" },
    { name: "amount", type: "uint256" },
  ],
  OfferItem: [
    { name: "itemType", type: "uint8" },
    { name: "token", type: "address" },
    { name: "identifierOrCriteria", type: "uint256" },
    { name: "startAmount", type: "uint256" },
    { name: "endAmount", type: "uint256" },
  ],
  ConsiderationItem: [
    { name: "itemType", type: "uint8" },
    { name: "token", type: "address" },
    { name: "identifierOrCriteria", type: "uint256" },
    { name: "startAmount", type: "uint256" },
    { name: "endAmount", type: "uint256" },
    { name: "recipient", type: "address" },
  ],
}
TYPES.PermitBatch = [{ name: "details", type: "PermitDetails[]" }, ...TYPES.PermitSingle.slice(1)]
TYPES.PermitBatchTransferFrom = [
  { name: "permitted", type: "TokenPermissions[]" },
  ...TYPES.PermitTransferFrom.slice(1),
]

const typedData = (
  primaryType: string,
  message: unknown,
  verifyingContract = PERMIT2,
  // the dai permit shares erc-2612's primary type but declares different fields
  fields = TYPES[primaryType]
) => ({
  primaryType,
  types: { ...TYPES, [primaryType]: fields },
  domain: { name: "Test", chainId: 1, verifyingContract },
  message,
})

describe("decodeEvmTypedData", () => {
  it("decodes an ERC-2612 permit against the token it is signed for", () => {
    const decoded = decodeEvmTypedData(
      typedData(
        "Permit",
        {
          owner: OWNER,
          spender: COUNTERPARTY,
          value: MAX_UINT256,
          nonce: 0,
          deadline: "1893456000",
        },
        USDC
      )
    )

    expect(decoded).toEqual({
      type: "permit",
      spender: COUNTERPARTY,
      allowances: [{ token: USDC, amount: 2n ** 256n - 1n }],
      deadline: 1893456000n,
    })
  })

  it("decodes a DAI permit, whose boolean grants an unlimited allowance", () => {
    const decoded = decodeEvmTypedData(
      typedData(
        "Permit",
        { holder: OWNER, spender: COUNTERPARTY, nonce: 0, expiry: 0, allowed: true },
        DAI,
        TYPES.DaiPermit
      )
    )

    // a DAI permit with expiry 0 never expires
    expect(decoded).toEqual({
      type: "permit",
      spender: COUNTERPARTY,
      allowances: [{ token: DAI, amount: 2n ** 256n - 1n }],
      deadline: undefined,
    })

    expect(
      decodeEvmTypedData(
        typedData(
          "Permit",
          { holder: OWNER, spender: COUNTERPARTY, nonce: 0, expiry: 0, allowed: false },
          DAI,
          TYPES.DaiPermit
        )
      )
    ).toMatchObject({ allowances: [{ token: DAI, amount: 0n }] })
  })

  it("only decodes the fields the primary type declares", () => {
    // `allowed` isn't part of an erc-2612 permit, so the signer ignores it - reading it would show
    // this unlimited allowance as a revocation
    expect(
      decodeEvmTypedData(
        typedData(
          "Permit",
          {
            owner: OWNER,
            spender: COUNTERPARTY,
            value: MAX_UINT256,
            nonce: 0,
            deadline: "1893456000",
            allowed: false,
          },
          USDC
        )
      )
    ).toMatchObject({ allowances: [{ token: USDC, amount: 2n ** 256n - 1n }] })

    // an undeclared sigDeadline can't shorten the deadline the signature is actually bound to
    expect(
      decodeEvmTypedData(
        typedData(
          "PermitTransferFrom",
          {
            permitted: { token: USDC, amount: "5000000" },
            spender: COUNTERPARTY,
            nonce: 1,
            deadline: MAX_UINT256,
            sigDeadline: "1767225600",
          },
          PERMIT2
        )
      )
    ).toMatchObject({ deadline: 2n ** 256n - 1n })

    // typed data that declares nothing for its primary type isn't signable, and isn't decodable
    expect(
      decodeEvmTypedData({
        primaryType: "Permit",
        types: {},
        domain: { verifyingContract: USDC },
        message: { owner: OWNER, spender: COUNTERPARTY, value: MAX_UINT256 },
      })
    ).toBeUndefined()
  })

  it("only decodes the fields a nested struct declares", () => {
    // permit2's TokenPermissions signs a token and an amount: an expiration smuggled next to them
    // isn't signed, and would show a one-off transfer as already expired
    expect(
      decodeEvmTypedData(
        typedData("PermitTransferFrom", {
          permitted: { token: USDC, amount: "5000000", expiration: "1" },
          spender: COUNTERPARTY,
          nonce: 1,
          deadline: MAX_UINT256,
        })
      )
    ).toMatchObject({ allowances: [{ token: USDC, expiration: undefined }] })

    // a struct the payload doesn't declare can't be signed at all
    expect(
      decodeEvmTypedData({
        ...typedData("PermitSingle", {
          details: { token: USDC, amount: MAX_UINT160, expiration: "1893456000", nonce: 0 },
          spender: COUNTERPARTY,
          sigDeadline: "1767225600",
        }),
        types: { PermitSingle: TYPES.PermitSingle },
      })
    ).toBeUndefined()
  })

  it("decodes a Permit2 PermitSingle, including the allowance's own expiration", () => {
    const decoded = decodeEvmTypedData(
      typedData("PermitSingle", {
        details: { token: USDC, amount: MAX_UINT160, expiration: "1893456000", nonce: 0 },
        spender: COUNTERPARTY,
        sigDeadline: "1767225600",
      })
    )

    expect(decoded).toEqual({
      type: "permit",
      spender: COUNTERPARTY,
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
        spender: COUNTERPARTY,
        sigDeadline: "1767225600",
      })
    )

    expect(decoded).toMatchObject({
      spender: COUNTERPARTY,
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
        spender: COUNTERPARTY,
        nonce: 1,
        deadline: "1767225600",
      })
    )

    expect(decoded).toEqual({
      type: "permit",
      spender: COUNTERPARTY,
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
            recipient: COUNTERPARTY,
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
          recipient: COUNTERPARTY,
        },
      ],
      deadline: 1767225600n,
    })
  })

  it("shows the worst case of a Seaport order whose amounts slide over time", () => {
    const decoded = decodeEvmTypedData(
      typedData("OrderComponents", {
        offerer: OWNER,
        // an erc1155 offer can end up taking more than it opens at
        offer: [
          {
            itemType: 3,
            token: NFT,
            identifierOrCriteria: "42",
            startAmount: "1",
            endAmount: "10",
          },
        ],
        // and a consideration can end up paying less
        consideration: [
          {
            itemType: 0,
            token: "0x0000000000000000000000000000000000000000",
            identifierOrCriteria: "0",
            startAmount: "1000000000000000000",
            endAmount: "1",
            recipient: OWNER,
          },
        ],
        endTime: "1767225600",
      })
    )

    expect(decoded).toMatchObject({
      offer: [{ amount: 10n }],
      consideration: [{ amount: 1n }],
    })
  })

  it("does not pass off a Seaport criteria root as a token id", () => {
    const decoded = decodeEvmTypedData(
      typedData("OrderComponents", {
        offerer: OWNER,
        // itemType 4 matches any token id under the criteria root, so there is no id to show
        offer: [
          {
            itemType: 4,
            token: NFT,
            identifierOrCriteria: "0",
            startAmount: "1",
            endAmount: "1",
          },
        ],
        consideration: [],
        endTime: "1767225600",
      })
    )

    expect(decoded).toMatchObject({ offer: [{ token: NFT, identifier: undefined, isNft: true }] })
  })

  it("ignores typed data it cannot decode rather than guessing", () => {
    expect(decodeEvmTypedData(undefined)).toBeUndefined()
    expect(
      decodeEvmTypedData(
        typedData("Mail", { contents: "hello" }, USDC, [{ name: "contents", type: "string" }])
      )
    ).toBeUndefined()
    // a permit without a spender, an amount, or a token tells us nothing about what is granted
    expect(
      decodeEvmTypedData(typedData("Permit", { owner: OWNER, value: MAX_UINT256 }, USDC))
    ).toBeUndefined()
    expect(
      decodeEvmTypedData(typedData("Permit", { owner: OWNER, spender: COUNTERPARTY }, USDC))
    ).toBeUndefined()
    expect(
      decodeEvmTypedData(
        typedData("PermitSingle", { details: { amount: MAX_UINT160 }, spender: COUNTERPARTY })
      )
    ).toBeUndefined()
    expect(
      decodeEvmTypedData(
        typedData("PermitBatch", {
          details: [
            { token: USDC, amount: MAX_UINT160 },
            { token: DAI, amount: "not a number" },
          ],
          spender: COUNTERPARTY,
        })
      )
    ).toBeUndefined()
    expect(
      decodeEvmTypedData(typedData("Permit", { spender: COUNTERPARTY, value: 1 }, "not an address"))
    ).toBeUndefined()
  })

  it("rejects a standard-looking type that signs more than the standard declares", () => {
    // an extra signed field can carry semantics the permit summary would hide
    expect(
      decodeEvmTypedData(
        typedData(
          "Permit",
          {
            owner: OWNER,
            spender: COUNTERPARTY,
            value: "1000000",
            nonce: 0,
            deadline: "1893456000",
            executor: COUNTERPARTY,
          },
          USDC,
          [...TYPES.Permit, { name: "executor", type: "address" }]
        )
      )
    ).toBeUndefined()

    // a retyped field isn't the standard's field, even with the same name
    expect(
      decodeEvmTypedData(
        typedData(
          "Permit",
          {
            owner: OWNER,
            spender: COUNTERPARTY,
            value: "1000000",
            nonce: 0,
            deadline: "1893456000",
          },
          USDC,
          TYPES.Permit.map((field) =>
            field.name === "value" ? { name: "value", type: "bytes32" } : field
          )
        )
      )
    ).toBeUndefined()

    // an extra field on a nested struct is signed too
    expect(
      decodeEvmTypedData({
        ...typedData("PermitSingle", {
          details: { token: USDC, amount: MAX_UINT160, expiration: "1893456000", nonce: 0 },
          spender: COUNTERPARTY,
          sigDeadline: "1767225600",
        }),
        types: {
          PermitSingle: TYPES.PermitSingle,
          PermitDetails: [...TYPES.PermitDetails, { name: "operator", type: "address" }],
        },
      })
    ).toBeUndefined()

    // a truncated order isn't a seaport order: its other fields could mean anything
    expect(
      decodeEvmTypedData({
        ...typedData("OrderComponents", {
          offerer: OWNER,
          offer: [],
          consideration: [],
          endTime: "1767225600",
        }),
        types: {
          OrderComponents: [
            { name: "offerer", type: "address" },
            { name: "offer", type: "OfferItem[]" },
            { name: "consideration", type: "ConsiderationItem[]" },
            { name: "endTime", type: "uint256" },
          ],
          OfferItem: TYPES.OfferItem,
          ConsiderationItem: TYPES.ConsiderationItem,
        },
      })
    ).toBeUndefined()
  })

  it("rejects a domain type that smuggles extra signed fields", () => {
    const permit = typedData(
      "Permit",
      { owner: OWNER, spender: COUNTERPARTY, value: "1000000", nonce: 0, deadline: "1893456000" },
      USDC
    )

    expect(
      decodeEvmTypedData({
        ...permit,
        types: {
          ...permit.types,
          EIP712Domain: [
            { name: "name", type: "string" },
            { name: "verifyingContract", type: "address" },
            { name: "executor", type: "address" },
          ],
        },
      })
    ).toBeUndefined()

    // the standard domain fields are fine, declared or not
    expect(
      decodeEvmTypedData({
        ...permit,
        types: {
          ...permit.types,
          EIP712Domain: [
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" },
          ],
        },
      })
    ).toMatchObject({ type: "permit", spender: COUNTERPARTY })
  })
})
