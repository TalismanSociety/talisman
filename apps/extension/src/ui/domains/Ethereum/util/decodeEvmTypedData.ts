import type { EvmAddress } from "@core/domains/ethereum/types"
import { isAddress } from "viem"

export type TypedDataAllowance = {
  token: EvmAddress
  amount: bigint
  // permit2 sets an expiry on the allowance itself, on top of the signature's deadline
  expiration?: bigint
}

export type DecodedTypedDataPermit = {
  type: "permit"
  spender: EvmAddress
  allowances: TypedDataAllowance[]
  deadline?: bigint
}

export type TypedDataOrderItem = {
  token: EvmAddress
  // criteria based items match a set of token ids instead of naming one
  identifier?: bigint
  amount: bigint
  isNft: boolean
  recipient?: EvmAddress
}

export type DecodedTypedDataOrder = {
  type: "order"
  offerer?: EvmAddress
  offer: TypedDataOrderItem[]
  consideration: TypedDataOrderItem[]
  deadline?: bigint
}

export type DecodedTypedData = DecodedTypedDataPermit | DecodedTypedDataOrder

const MAX_UINT256 = 2n ** 256n - 1n

// seaport item types 0 and 1 are native and ERC20, everything above is an ERC721/ERC1155 item
const SEAPORT_FIRST_NFT_ITEM_TYPE = 2n
// item types 4 and 5 match a criteria root rather than a token id
const SEAPORT_FIRST_CRITERIA_ITEM_TYPE = 4n

const maxBigInt = (a: bigint, b: bigint) => (a > b ? a : b)
const minBigInt = (a: bigint, b: bigint) => (a < b ? a : b)

const asAddress = (value: unknown) =>
  typeof value === "string" && isAddress(value, { strict: false }) ? value : undefined

// typed data is json: dapps encode uint256 fields as a number, a decimal string or a hex string
const asBigInt = (value: unknown) => {
  if (typeof value === "bigint") return value
  if (typeof value === "number") return Number.isSafeInteger(value) ? BigInt(value) : undefined
  if (typeof value !== "string" || !value.trim()) return undefined
  try {
    return BigInt(value)
  } catch {
    return undefined
  }
}

type TypedDataRecord = Record<string, unknown>
type TypedDataField = { name: string; type: string }

const asRecord = (value: unknown) =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as TypedDataRecord)
    : undefined

const asRecordList = (value: unknown) =>
  Array.isArray(value) ? value.map(asRecord).filter((item) => !!item) : undefined

const asFieldList = (value: unknown) => {
  const fields = asRecordList(value)
  if (!fields?.length) return undefined
  if (fields.some((field) => typeof field.name !== "string" || typeof field.type !== "string"))
    return undefined

  return fields as TypedDataField[]
}

type StructSchema = Record<string, string[]>

// the eip-712 domain only identifies the verifying contract; an extra field declared there would
// be signed without ever being shown
const DOMAIN_FIELD_TYPES: Record<string, string> = {
  name: "string",
  version: "string",
  chainId: "uint256",
  verifyingContract: "address",
  salt: "bytes32",
}

const PERMIT2_DETAILS = ["token:address", "amount:uint160", "expiration:uint48", "nonce:uint48"]
const PERMIT2_PERMITTED = ["token:address", "amount:uint256"]
const SEAPORT_OFFER_ITEM = [
  "itemType:uint8",
  "token:address",
  "identifierOrCriteria:uint256",
  "startAmount:uint256",
  "endAmount:uint256",
]

// a summary can only replace the raw message if it describes every signed field, so each standard
// is pinned to its exact type graph: a payload that adds, drops, retypes or reorders any field can
// carry semantics the summary doesn't show, and must keep the generic view
const STANDARD_SCHEMAS: Record<string, StructSchema[]> = {
  Permit: [
    {
      Permit: [
        "owner:address",
        "spender:address",
        "value:uint256",
        "nonce:uint256",
        "deadline:uint256",
      ],
    },
    // dai's variant
    {
      Permit: [
        "holder:address",
        "spender:address",
        "nonce:uint256",
        "expiry:uint256",
        "allowed:bool",
      ],
    },
  ],
  PermitSingle: [
    {
      PermitSingle: ["details:PermitDetails", "spender:address", "sigDeadline:uint256"],
      PermitDetails: PERMIT2_DETAILS,
    },
  ],
  PermitBatch: [
    {
      PermitBatch: ["details:PermitDetails[]", "spender:address", "sigDeadline:uint256"],
      PermitDetails: PERMIT2_DETAILS,
    },
  ],
  PermitTransferFrom: [
    {
      PermitTransferFrom: [
        "permitted:TokenPermissions",
        "spender:address",
        "nonce:uint256",
        "deadline:uint256",
      ],
      TokenPermissions: PERMIT2_PERMITTED,
    },
  ],
  PermitBatchTransferFrom: [
    {
      PermitBatchTransferFrom: [
        "permitted:TokenPermissions[]",
        "spender:address",
        "nonce:uint256",
        "deadline:uint256",
      ],
      TokenPermissions: PERMIT2_PERMITTED,
    },
  ],
  OrderComponents: [
    {
      OrderComponents: [
        "offerer:address",
        "zone:address",
        "offer:OfferItem[]",
        "consideration:ConsiderationItem[]",
        "orderType:uint8",
        "startTime:uint256",
        "endTime:uint256",
        "zoneHash:bytes32",
        "salt:uint256",
        "conduitKey:bytes32",
        "counter:uint256",
      ],
      OfferItem: SEAPORT_OFFER_ITEM,
      ConsiderationItem: [...SEAPORT_OFFER_ITEM, "recipient:address"],
    },
  ],
}

const matchesStruct = (declared: unknown, expected: string[]) => {
  const fields = asFieldList(declared)
  return (
    !!fields &&
    fields.length === expected.length &&
    fields.every((field, index) => `${field.name}:${field.type}` === expected[index])
  )
}

const matchesSchema = (types: TypedDataRecord, schema: StructSchema) =>
  Object.entries(schema).every(([name, fields]) => matchesStruct(types[name], fields))

// the domain type may be omitted (signers then derive it from the domain's own keys), but when
// declared it must only carry the standard identity fields
const isStandardDomainType = (types: TypedDataRecord) => {
  if (!("EIP712Domain" in types)) return true

  const fields = asFieldList(types.EIP712Domain)
  if (!fields) return false

  const names = fields.map((field) => field.name)
  return (
    new Set(names).size === names.length &&
    fields.every((field) => DOMAIN_FIELD_TYPES[field.name] === field.type)
  )
}

const ARRAY_TYPE = /^(.+)\[\d*\]$/
// a struct can't contain itself, so a message that keeps nesting isn't signable
const MAX_STRUCT_DEPTH = 8

const getSignedValue = (
  types: TypedDataRecord,
  type: string,
  value: unknown,
  depth: number
): unknown => {
  const itemType = ARRAY_TYPE.exec(type)?.[1]
  if (itemType)
    return Array.isArray(value)
      ? value.map((item) => getSignedValue(types, itemType, item, depth))
      : undefined

  // atomic values are signed as they are, while a struct the payload doesn't declare can't be signed
  if (!types[type]) return asRecord(value) ? undefined : value

  return getSignedStruct(types, type, value, depth)
}

// only the fields a struct declares are part of the signed data: anything else in the message is
// ignored by the signer, so decoding it would describe a permission that isn't granted
const getSignedStruct = (
  types: TypedDataRecord,
  type: string,
  value: unknown,
  depth = 0
): TypedDataRecord | undefined => {
  const fields = asFieldList(types[type])
  const record = asRecord(value)
  if (!fields || !record || depth > MAX_STRUCT_DEPTH) return undefined

  return Object.fromEntries(
    fields
      .filter((field) => field.name in record)
      .map((field) => [
        field.name,
        getSignedValue(types, field.type, record[field.name], depth + 1),
      ])
  )
}

// erc-2612 permits are signed against the token itself, which is the domain's verifying contract
const decodeErc2612Permit = (
  domain: TypedDataRecord | undefined,
  message: TypedDataRecord
): DecodedTypedDataPermit | undefined => {
  const token = asAddress(domain?.verifyingContract)
  const spender = asAddress(message.spender)
  if (!token || !spender) return undefined

  // dai's variant grants an all-or-nothing allowance instead of an amount, and never expires when
  // its expiry is 0
  const isDaiStyle = typeof message.allowed === "boolean"
  const amount = isDaiStyle ? (message.allowed ? MAX_UINT256 : 0n) : asBigInt(message.value)
  if (amount === undefined) return undefined

  const deadline = asBigInt(isDaiStyle ? message.expiry : message.deadline)

  return {
    type: "permit",
    spender,
    allowances: [{ token, amount }],
    deadline: isDaiStyle && deadline === 0n ? undefined : deadline,
  }
}

const decodePermit2Allowance = (item: TypedDataRecord): TypedDataAllowance | undefined => {
  const token = asAddress(item.token)
  const amount = asBigInt(item.amount)
  if (!token || amount === undefined) return undefined

  return { token, amount, expiration: asBigInt(item.expiration) }
}

// permit2 signs allowances (PermitSingle/PermitBatch) and one-off transfers
// (PermitTransferFrom/PermitBatchTransferFrom), which both delegate spending to `spender`
const decodePermit2Permit = (
  message: TypedDataRecord,
  itemsKey: "details" | "permitted"
): DecodedTypedDataPermit | undefined => {
  const spender = asAddress(message.spender)
  const single = asRecord(message[itemsKey])
  const records = asRecordList(message[itemsKey]) ?? (single ? [single] : [])
  const allowances = records.map(decodePermit2Allowance)

  if (!spender || !allowances.length || allowances.some((allowance) => !allowance)) return undefined

  return {
    type: "permit",
    spender,
    allowances: allowances as TypedDataAllowance[],
    deadline: asBigInt(message.sigDeadline ?? message.deadline),
  }
}

const decodeSeaportOrderItem = (
  item: TypedDataRecord,
  isOutgoing: boolean
): TypedDataOrderItem | undefined => {
  const token = asAddress(item.token)
  const itemType = asBigInt(item.itemType)
  const identifier = asBigInt(item.identifierOrCriteria)
  // an item's amount slides from its start amount to its end amount over the order's lifetime, so
  // the signer can end up sending the larger of the two, or receiving the smaller
  const startAmount = asBigInt(item.startAmount)
  const endAmount = asBigInt(item.endAmount)
  if (!token || itemType === undefined || identifier === undefined) return undefined
  if (startAmount === undefined || endAmount === undefined) return undefined

  const isCriteria = itemType >= SEAPORT_FIRST_CRITERIA_ITEM_TYPE

  return {
    token,
    identifier: isCriteria ? undefined : identifier,
    amount: isOutgoing ? maxBigInt(startAmount, endAmount) : minBigInt(startAmount, endAmount),
    isNft: itemType >= SEAPORT_FIRST_NFT_ITEM_TYPE,
    recipient: asAddress(item.recipient),
  }
}

// a seaport order gives away every offer item in exchange for the consideration items, so signing
// one transfers assets just as an allowance lets someone else take them
const decodeSeaportOrder = (message: TypedDataRecord): DecodedTypedDataOrder | undefined => {
  const offer = asRecordList(message.offer)?.map((item) => decodeSeaportOrderItem(item, true))
  const consideration = asRecordList(message.consideration)?.map((item) =>
    decodeSeaportOrderItem(item, false)
  )

  if (!offer?.length || !consideration || offer.some((item) => !item)) return undefined
  if (consideration.some((item) => !item)) return undefined

  return {
    type: "order",
    offerer: asAddress(message.offerer),
    offer: offer as TypedDataOrderItem[],
    consideration: consideration as TypedDataOrderItem[],
    deadline: asBigInt(message.endTime),
  }
}

export const decodeEvmTypedData = (typedData: unknown): DecodedTypedData | undefined => {
  const parsed = asRecord(typedData)
  const types = asRecord(parsed?.types)
  if (!parsed || !types || typeof parsed.primaryType !== "string") return undefined
  if (!isStandardDomainType(types)) return undefined

  const schemas = STANDARD_SCHEMAS[parsed.primaryType]
  if (!schemas?.some((schema) => matchesSchema(types, schema))) return undefined

  const message = getSignedStruct(types, parsed.primaryType, parsed.message)
  if (!message) return undefined

  switch (parsed.primaryType) {
    case "Permit":
      return decodeErc2612Permit(asRecord(parsed.domain), message)
    case "PermitSingle":
    case "PermitBatch":
      return decodePermit2Permit(message, "details")
    case "PermitTransferFrom":
    case "PermitBatchTransferFrom":
      return decodePermit2Permit(message, "permitted")
    case "OrderComponents":
      return decodeSeaportOrder(message)
    default:
      return undefined
  }
}
