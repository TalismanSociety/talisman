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
  identifier: bigint
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
const SEAPORT_FIRST_NFT_ITEM_TYPE = 2

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

const asRecord = (value: unknown) =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as TypedDataRecord)
    : undefined

const asRecordList = (value: unknown) =>
  Array.isArray(value) ? value.map(asRecord).filter((item) => !!item) : undefined

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

const decodeSeaportOrderItem = (item: TypedDataRecord): TypedDataOrderItem | undefined => {
  const token = asAddress(item.token)
  const itemType = asBigInt(item.itemType)
  const identifier = asBigInt(item.identifierOrCriteria)
  // an item's amount can vary over the order's lifetime, the start amount is what it opens at
  const amount = asBigInt(item.startAmount)
  if (!token || itemType === undefined || identifier === undefined || amount === undefined)
    return undefined

  return {
    token,
    identifier,
    amount,
    isNft: itemType >= BigInt(SEAPORT_FIRST_NFT_ITEM_TYPE),
    recipient: asAddress(item.recipient),
  }
}

// a seaport order gives away every offer item in exchange for the consideration items, so signing
// one transfers assets just as an allowance lets someone else take them
const decodeSeaportOrder = (message: TypedDataRecord): DecodedTypedDataOrder | undefined => {
  const offer = asRecordList(message.offer)?.map(decodeSeaportOrderItem)
  const consideration = asRecordList(message.consideration)?.map(decodeSeaportOrderItem)

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
  const message = asRecord(parsed?.message)
  if (!message) return undefined

  switch (parsed?.primaryType) {
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
