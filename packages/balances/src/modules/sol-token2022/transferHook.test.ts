import type { Address, Instruction } from "@solana/kit"
import {
  AccountRole,
  getAddressEncoder,
  getProgramDerivedAddress,
  address as solAddress,
} from "@solana/kit"
import type { SolRpc } from "@talismn/chain-connectors"
import { describe, expect, it } from "vitest"

import { addExtraAccountMetasForTransferHook, getExtraAccountMetaAddress } from "./transferHook"

const HOOK_PROGRAM = solAddress("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb")
const MINT = solAddress("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")
const SOURCE = solAddress("5xJvx7YrqCqgyzxx4PQXt1AVbxioUsGABf2zevmYC8UL")
const DEST = solAddress("BLTQrMi4wCkrHYAaePv7bcHUuoYFPTMkxJdWkAqLB55A")
const AUTHORITY = solAddress("7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV1")
const FIXED_EXTRA = solAddress("11111111111111111111111111111111")

const addressEncoder = getAddressEncoder()

/** Builds an ExtraAccountMetaList account payload (u64 discriminator, u32 length, u32 count, 35-byte entries) */
const buildValidationAccountData = (
  entries: {
    discriminator: number
    addressConfig: Uint8Array
    isSigner?: boolean
    isWritable?: boolean
  }[]
) => {
  const data = new Uint8Array(16 + entries.length * 35)
  const view = new DataView(data.buffer)
  view.setUint32(8, 4 + entries.length * 35, true) // length
  view.setUint32(12, entries.length, true) // count
  entries.forEach((entry, i) => {
    const offset = 16 + i * 35
    data[offset] = entry.discriminator
    data.set(entry.addressConfig.subarray(0, 32), offset + 1)
    data[offset + 33] = entry.isSigner ? 1 : 0
    data[offset + 34] = entry.isWritable ? 1 : 0
  })
  return data
}

const makeRpc = (accounts: Record<string, Uint8Array>): SolRpc =>
  ({
    getAccountInfo: (address: Address) => ({
      send: async () => ({
        value: accounts[address]
          ? { data: [Buffer.from(accounts[address]!).toString("base64"), "base64"] }
          : null,
      }),
    }),
  }) as unknown as SolRpc

const baseInstruction: Instruction = {
  programAddress: HOOK_PROGRAM,
  accounts: [
    { address: SOURCE, role: AccountRole.WRITABLE },
    { address: MINT, role: AccountRole.READONLY },
    { address: DEST, role: AccountRole.WRITABLE },
    { address: AUTHORITY, role: AccountRole.READONLY_SIGNER },
  ],
  data: new Uint8Array([12, 0, 0, 0]),
}

describe("addExtraAccountMetasForTransferHook", () => {
  it("returns the instruction unchanged when there is no validation account", async () => {
    const rpc = makeRpc({})
    const result = await addExtraAccountMetasForTransferHook({
      rpc,
      instruction: baseInstruction,
      hookProgramId: HOOK_PROGRAM,
      source: SOURCE,
      mint: MINT,
      destination: DEST,
      authority: AUTHORITY,
      amount: 100n,
    })

    expect(result).toBe(baseInstruction)
  })

  it("appends a fixed-address extra meta, the hook program and the validation account", async () => {
    const validateState = await getExtraAccountMetaAddress(MINT, HOOK_PROGRAM)
    const rpc = makeRpc({
      [validateState]: buildValidationAccountData([
        {
          discriminator: 0, // fixed address
          addressConfig: new Uint8Array(addressEncoder.encode(FIXED_EXTRA)),
          isWritable: true,
        },
      ]),
    })

    const result = await addExtraAccountMetasForTransferHook({
      rpc,
      instruction: baseInstruction,
      hookProgramId: HOOK_PROGRAM,
      source: SOURCE,
      mint: MINT,
      destination: DEST,
      authority: AUTHORITY,
      amount: 100n,
    })

    const appended = result.accounts!.slice(baseInstruction.accounts!.length)
    expect(appended).toEqual([
      { address: FIXED_EXTRA, role: AccountRole.WRITABLE },
      { address: HOOK_PROGRAM, role: AccountRole.READONLY },
      { address: validateState, role: AccountRole.READONLY },
    ])
  })

  it("resolves a PDA extra meta from literal and account-key seeds", async () => {
    const validateState = await getExtraAccountMetaAddress(MINT, HOOK_PROGRAM)

    // seeds: literal "counter" + account key at index 1 (mint)
    const literal = new TextEncoder().encode("counter")
    const addressConfig = new Uint8Array(32)
    let offset = 0
    addressConfig[offset++] = 1 // literal seed discriminator
    addressConfig[offset++] = literal.length
    addressConfig.set(literal, offset)
    offset += literal.length
    addressConfig[offset++] = 3 // account-key seed discriminator
    addressConfig[offset++] = 1 // index 1 = mint (execute instruction key order)

    const rpc = makeRpc({
      [validateState]: buildValidationAccountData([
        { discriminator: 1, addressConfig }, // PDA of the hook program
      ]),
    })

    const result = await addExtraAccountMetasForTransferHook({
      rpc,
      instruction: baseInstruction,
      hookProgramId: HOOK_PROGRAM,
      source: SOURCE,
      mint: MINT,
      destination: DEST,
      authority: AUTHORITY,
      amount: 100n,
    })

    const [expectedPda] = await getProgramDerivedAddress({
      programAddress: HOOK_PROGRAM,
      seeds: ["counter", addressEncoder.encode(MINT)],
    })

    const appended = result.accounts!.slice(baseInstruction.accounts!.length)
    expect(appended[0]).toEqual({ address: expectedPda, role: AccountRole.READONLY })
  })
})
