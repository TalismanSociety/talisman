import { fromHex, mergeUint8, toHex } from "@polkadot-api/utils"
import type { IChainConnectorDot } from "@talismn/chain-connectors"
import { getSs58AddressInfo } from "polkadot-api"
import { Bytes, compact, Enum, enhanceCodec, Result, Struct, u32, u128 } from "scale-ts"

import psp22Abi from "../abis/psp22.json"

/** decodes an ss58 address to its 32-byte account id */
const accountId32 = (address: string): Uint8Array => {
  const info = getSs58AddressInfo(address)
  if (!info.isValid || info.publicKey.length !== 32) throw new Error(`Invalid address: ${address}`)
  return info.publicKey
}

const getPsp22MessageSelector = (label: string): Uint8Array => {
  const message = psp22Abi.spec.messages.find((message) => message.label === label)
  if (!message) throw new Error(`Unable to find message ${label} in PSP22 ABI`)
  return fromHex(message.selector)
}

const EMPTY_BYTES = new Uint8Array(0)

/**
 * Encoders for the ink! PSP22 contract messages used by this module.
 *
 * An ink! message payload is the 4-byte selector (from the ABI) followed by the SCALE-encoded arguments.
 */
export const encodePsp22Message = {
  /** PSP22::balance_of(owner: AccountId) */
  balanceOf: (owner: string): Uint8Array =>
    mergeUint8([getPsp22MessageSelector("PSP22::balance_of"), accountId32(owner)]),

  /** PSP22Metadata::token_symbol() */
  tokenSymbol: (): Uint8Array => getPsp22MessageSelector("PSP22Metadata::token_symbol"),

  /** PSP22Metadata::token_decimals() */
  tokenDecimals: (): Uint8Array => getPsp22MessageSelector("PSP22Metadata::token_decimals"),

  /** PSP22::transfer(to: AccountId, value: u128, data: Vec<u8>) - with empty data */
  transfer: (to: string, value: bigint): Uint8Array =>
    mergeUint8([
      getPsp22MessageSelector("PSP22::transfer"),
      accountId32(to),
      u128.enc(value),
      Bytes().enc(EMPTY_BYTES),
    ]),
}

const compactBigInt = enhanceCodec(
  compact,
  (value: bigint) => value,
  (value) => BigInt(value)
)

const WeightV2 = Struct({ refTime: compactBigInt, proofSize: compactBigInt })

/** pallet_contracts::ContractExecResult, as returned by the ContractsApi_call runtime api */
const ContractExecResultCodec = Struct({
  gasConsumed: WeightV2,
  gasRequired: WeightV2,
  storageDeposit: Enum({ Refund: u128, Charge: u128 }),
  debugMessage: Bytes(),
  result: Result(
    Struct({ flags: u32, data: Bytes() }),
    Bytes(Infinity) // DispatchError - keep the raw bytes, this module doesn't consume them
  ),
})

/** encodes the arguments of the ContractsApi_call runtime api */
const encodeContractsApiCallArgs = (
  callFrom: string,
  contractAddress: string,
  inputData: Uint8Array
): Uint8Array =>
  mergeUint8([
    // origin: AccountId
    accountId32(callFrom),
    // dest: AccountId
    accountId32(contractAddress),
    // value: Balance
    u128.enc(0n),
    // gasLimit: Option<WeightV2> = None
    Uint8Array.of(0),
    // storageDepositLimit: Option<Balance> = None
    Uint8Array.of(0),
    // inputData: Vec<u8>
    Bytes().enc(inputData),
  ])

export const makeContractCaller =
  ({ chainConnector, chainId }: { chainConnector: IChainConnectorDot; chainId: string }) =>
  async (callFrom: string, contractAddress: string, inputData: Uint8Array) =>
    ContractExecResultCodec.dec(
      await chainConnector.send<string>(chainId, "state_call", [
        "ContractsApi_call",
        toHex(encodeContractsApiCallArgs(callFrom, contractAddress, inputData)),
      ])
    )
