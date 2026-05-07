import { AccountId } from "polkadot-api"
import { Bytes, compact, Enum, Option, Result, Struct, u32, u128 } from "scale-ts"

// PSP22 message selectors from the ABI
const PSP22_SELECTORS = {
  "PSP22::balance_of": new Uint8Array([0x65, 0x68, 0x38, 0x2f]),
  "PSP22::transfer": new Uint8Array([0xdb, 0x20, 0xf9, 0xf5]),
  "PSP22Metadata::token_symbol": new Uint8Array([0x34, 0x20, 0x5b, 0xe5]),
  "PSP22Metadata::token_decimals": new Uint8Array([0x72, 0x71, 0xb7, 0x82]),
} as const

type Psp22Message = keyof typeof PSP22_SELECTORS

const accountIdCodec = AccountId()

// SCALE codec for ink! AccountId arg: the raw 32-byte public key
const encodeAccountId = (address: string): Uint8Array => accountIdCodec.enc(address)

// SCALE codec for ink! u128 arg
const encodeU128 = (value: bigint | number | string): Uint8Array => u128.enc(BigInt(value))

// SCALE codec for Vec<u8>
const encodeVecU8 = (data: Uint8Array | undefined): Uint8Array => {
  if (!data) return compact.enc(0)
  return Bytes().enc(data)
}

/**
 * Encode a PSP22 contract message call with arguments.
 * Equivalent to `Abi.findMessage(name).toU8a(args)`.
 */
export const encodePsp22Message = (message: Psp22Message, args: unknown[] = []): Uint8Array => {
  const selector = PSP22_SELECTORS[message]
  const encodedArgs: Uint8Array[] = []

  switch (message) {
    case "PSP22::balance_of":
      encodedArgs.push(encodeAccountId(args[0] as string))
      break
    case "PSP22::transfer":
      encodedArgs.push(encodeAccountId(args[0] as string))
      encodedArgs.push(encodeU128(args[1] as bigint))
      encodedArgs.push(encodeVecU8(args[2] as Uint8Array | undefined))
      break
    case "PSP22Metadata::token_symbol":
    case "PSP22Metadata::token_decimals":
      break
  }

  const totalLength = selector.length + encodedArgs.reduce((sum, a) => sum + a.length, 0)
  const result = new Uint8Array(totalLength)
  result.set(selector, 0)
  let offset = selector.length
  for (const arg of encodedArgs) {
    result.set(arg, offset)
    offset += arg.length
  }
  return result
}

// --- ContractExecResult SCALE decoder ---

const Weight = Struct({ refTime: compact, proofSize: compact })

const StorageDepositCodec = Enum({
  Refund: u128,
  Charge: u128,
})

const ExecReturnValue = Struct({
  flags: u32,
  data: Bytes(),
})

// For DispatchError we use an opaque decoder — we only care about Ok/Err discrimination
const ContractExecResultResult = Result(ExecReturnValue, Bytes())

const ContractExecResultCodec = Struct({
  gasConsumed: Weight,
  gasRequired: Weight,
  storageDeposit: StorageDepositCodec,
  debugMessage: Bytes(),
  result: ContractExecResultResult,
})

type DecodedContractExecResult = ReturnType<typeof ContractExecResultCodec.dec>

export interface ContractExecResult {
  gasConsumed: { refTime: bigint; proofSize: bigint }
  gasRequired: { refTime: bigint; proofSize: bigint }
  storageDeposit: { tag: "Refund"; value: bigint } | { tag: "Charge"; value: bigint }
  result: { success: true; flags: number; data: Uint8Array } | { success: false; error: Uint8Array }
}

const toHex = (bytes: Uint8Array): string =>
  `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`

const fromHex = (hex: string): Uint8Array => {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++)
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  return bytes
}

export const decodeContractExecResult = (response: string): ContractExecResult => {
  const bytes = fromHex(response)
  const decoded: DecodedContractExecResult = ContractExecResultCodec.dec(bytes)

  const storageDeposit =
    decoded.storageDeposit.tag === "Refund"
      ? { tag: "Refund" as const, value: decoded.storageDeposit.value }
      : { tag: "Charge" as const, value: decoded.storageDeposit.value }

  const result = decoded.result.success
    ? { success: true as const, flags: decoded.result.value.flags, data: decoded.result.value.data }
    : { success: false as const, error: decoded.result.value }

  return {
    gasConsumed: {
      refTime: BigInt(decoded.gasConsumed.refTime),
      proofSize: BigInt(decoded.gasConsumed.proofSize),
    },
    gasRequired: {
      refTime: BigInt(decoded.gasRequired.refTime),
      proofSize: BigInt(decoded.gasRequired.proofSize),
    },
    storageDeposit,
    result,
  }
}

// --- Encoding ContractsApi_call args ---

const u8aConcat = (...arrays: Uint8Array[]): Uint8Array => {
  const length = arrays.reduce((total, arr) => total + arr.length, 0)
  const result = new Uint8Array(length)
  let offset = 0
  for (const arr of arrays) {
    result.set(arr, offset)
    offset += arr.length
  }
  return result
}

/**
 * Encode the arguments for a `ContractsApi_call` state call.
 */
export const encodeContractsApiCallArgs = (
  origin: string,
  dest: string,
  inputData: Uint8Array
): string => {
  const encoded = u8aConcat(
    encodeAccountId(origin),
    encodeAccountId(dest),
    u128.enc(0n), // value = 0
    Option(Weight).enc(undefined), // gasLimit = None
    Option(u128).enc(undefined), // storageDepositLimit = None
    Bytes().enc(inputData)
  )
  return toHex(encoded)
}

/**
 * Encode Vec<u8> and return hex (for transfer call data encoding).
 */
export const encodeVecU8Hex = (data: Uint8Array): `0x${string}` => {
  return toHex(Bytes().enc(data)) as `0x${string}`
}
