import type { AccountMeta, Address, Instruction } from "@solana/kit"
import {
  AccountRole,
  getAddressDecoder,
  getAddressEncoder,
  getProgramDerivedAddress,
  address as solAddress,
} from "@solana/kit"
import type { SolRpc } from "@talismn/chain-connectors"

/**
 * Ported from @solana/spl-token 0.4.14 `extensions/transferHook` (state.js, seeds.js,
 * pubkeyData.js, instructions.js), rewritten on kit primitives. The token-2022 kit client
 * (@solana-program/token-2022 0.12.0) has no equivalent of `addExtraAccountMetasForExecute`
 * — it only ships the initialize/update admin instructions — so the extra-account
 * resolution for transfer-hook tokens must live here.
 */

type ResolvedMeta = { address: Address; isSigner: boolean; isWritable: boolean }

// `ExecuteInstruction` discriminator
const EXECUTE_DISCRIMINATOR = Uint8Array.from([105, 37, 101, 197, 75, 251, 102, 26])

const PUBLIC_KEY_LENGTH = 32
const EXTRA_ACCOUNT_META_SIZE = 35 // u8 discriminator + 32-byte addressConfig + bool isSigner + bool isWritable

const addressEncoder = getAddressEncoder()
const addressDecoder = getAddressDecoder()

export const getExtraAccountMetaAddress = async (
  mint: string,
  hookProgramId: Address
): Promise<Address> => {
  const [pda] = await getProgramDerivedAddress({
    programAddress: hookProgramId,
    seeds: ["extra-account-metas", addressEncoder.encode(solAddress(mint))],
  })
  return pda
}

/** Unpack an extra account metas account into a list of raw ExtraAccountMeta entries */
const getExtraAccountMetas = (data: Uint8Array) => {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  // layout: u64 instructionDiscriminator, u32 length, u32 count, count × 35-byte entries
  const count = view.getUint32(12, true)
  const metas: {
    discriminator: number
    addressConfig: Uint8Array
    isSigner: boolean
    isWritable: boolean
  }[] = []
  for (let i = 0; i < count; i++) {
    const offset = 16 + i * EXTRA_ACCOUNT_META_SIZE
    metas.push({
      discriminator: data[offset]!,
      addressConfig: data.subarray(offset + 1, offset + 33),
      isSigner: data[offset + 33] !== 0,
      isWritable: data[offset + 34] !== 0,
    })
  }
  return metas
}

const getAccountData = async (rpc: SolRpc, address: Address): Promise<Uint8Array | null> => {
  const { value } = await rpc.getAccountInfo(address, { encoding: "base64" }).send()
  if (!value) return null
  return new Uint8Array(Buffer.from(value.data[0], "base64"))
}

const unpackSeeds = async (
  rpc: SolRpc,
  seeds: Uint8Array,
  previousMetas: ResolvedMeta[],
  instructionData: Uint8Array
): Promise<Uint8Array[]> => {
  const unpacked: Uint8Array[] = []
  let i = 0
  while (i < 32) {
    const discriminator = seeds[i]!
    const rest = seeds.subarray(i + 1)
    switch (discriminator) {
      case 0:
        return unpacked
      case 1: {
        // literal: u8 length + bytes
        const length = rest[0]!
        if (rest.length < 1 + length) throw new Error("Invalid transfer hook seed")
        unpacked.push(rest.subarray(1, 1 + length))
        i += 2 + length
        break
      }
      case 2: {
        // instruction arg: u8 offset + u8 length
        const [offset, length] = [rest[0]!, rest[1]!]
        if (instructionData.length < offset + length) throw new Error("Invalid transfer hook seed")
        unpacked.push(instructionData.subarray(offset, offset + length))
        i += 3
        break
      }
      case 3: {
        // account key at index
        const index = rest[0]!
        const meta = previousMetas[index]
        if (!meta) throw new Error("Invalid transfer hook seed")
        unpacked.push(new Uint8Array(addressEncoder.encode(meta.address)))
        i += 2
        break
      }
      case 4: {
        // account data: u8 accountIndex + u8 dataOffset + u8 length
        const [accountIndex, dataOffset, length] = [rest[0]!, rest[1]!, rest[2]!]
        const meta = previousMetas[accountIndex]
        if (!meta) throw new Error("Invalid transfer hook seed")
        const accountData = await getAccountData(rpc, meta.address)
        if (!accountData) throw new Error("Transfer hook seed account data not found")
        if (accountData.length < dataOffset + length) throw new Error("Invalid transfer hook seed")
        unpacked.push(accountData.subarray(dataOffset, dataOffset + length))
        i += 4
        break
      }
      default:
        throw new Error("Invalid transfer hook seed")
    }
  }
  return unpacked
}

const unpackPubkeyData = async (
  rpc: SolRpc,
  keyDataConfig: Uint8Array,
  previousMetas: ResolvedMeta[],
  instructionData: Uint8Array
): Promise<Address> => {
  const discriminator = keyDataConfig[0]!
  const rest = keyDataConfig.subarray(1)
  switch (discriminator) {
    case 1: {
      // pubkey from instruction data at offset
      const dataIndex = rest[0]!
      if (instructionData.length < dataIndex + PUBLIC_KEY_LENGTH)
        throw new Error("Transfer hook pubkey data too small")
      return addressDecoder.decode(
        instructionData.subarray(dataIndex, dataIndex + PUBLIC_KEY_LENGTH)
      )
    }
    case 2: {
      // pubkey from account data
      const [accountIndex, dataIndex] = [rest[0]!, rest[1]!]
      const meta = previousMetas[accountIndex]
      if (!meta) throw new Error("Transfer hook account data not found")
      const accountData = await getAccountData(rpc, meta.address)
      if (!accountData) throw new Error("Transfer hook account not found")
      if (accountData.length < dataIndex + PUBLIC_KEY_LENGTH)
        throw new Error("Transfer hook pubkey data too small")
      return addressDecoder.decode(accountData.subarray(dataIndex, dataIndex + PUBLIC_KEY_LENGTH))
    }
    default:
      throw new Error("Invalid transfer hook pubkey data")
  }
}

const resolveExtraAccountMeta = async (
  rpc: SolRpc,
  extraMeta: ReturnType<typeof getExtraAccountMetas>[number],
  previousMetas: ResolvedMeta[],
  instructionData: Uint8Array,
  hookProgramId: Address
): Promise<ResolvedMeta> => {
  const { discriminator, addressConfig, isSigner, isWritable } = extraMeta

  if (discriminator === 0)
    return { address: addressDecoder.decode(addressConfig), isSigner, isWritable }

  if (discriminator === 2) {
    const address = await unpackPubkeyData(rpc, addressConfig, previousMetas, instructionData)
    return { address, isSigner, isWritable }
  }

  let programAddress: Address
  if (discriminator === 1) {
    programAddress = hookProgramId
  } else {
    const accountIndex = discriminator - (1 << 7)
    const meta = previousMetas[accountIndex]
    if (!meta) throw new Error("Transfer hook account not found")
    programAddress = meta.address
  }

  const seeds = await unpackSeeds(rpc, addressConfig, previousMetas, instructionData)
  const [address] = await getProgramDerivedAddress({ programAddress, seeds })
  return { address, isSigner, isWritable }
}

/** Demote privileges if the account already appears in the list with lower privileges */
const deEscalate = (meta: ResolvedMeta, previousMetas: ResolvedMeta[]): ResolvedMeta => {
  const highest = previousMetas
    .filter((x) => x.address === meta.address)
    .reduce<{ isSigner: boolean; isWritable: boolean } | undefined>(
      (acc, x) =>
        acc
          ? { isSigner: acc.isSigner || x.isSigner, isWritable: acc.isWritable || x.isWritable }
          : { isSigner: x.isSigner, isWritable: x.isWritable },
      undefined
    )
  if (!highest) return meta
  return {
    address: meta.address,
    isSigner: meta.isSigner && highest.isSigner,
    isWritable: meta.isWritable && highest.isWritable,
  }
}

const toAccountRole = ({ isSigner, isWritable }: ResolvedMeta): AccountRole =>
  isSigner
    ? isWritable
      ? AccountRole.WRITABLE_SIGNER
      : AccountRole.READONLY_SIGNER
    : isWritable
      ? AccountRole.WRITABLE
      : AccountRole.READONLY

/**
 * Appends all the extra accounts required by a transfer-hook token to a
 * transferChecked(WithFee) instruction: the resolved extra metas, the hook
 * program and the validation state account.
 *
 * Returns the instruction unchanged when the hook has no validation state account.
 */
export const addExtraAccountMetasForTransferHook = async <T extends Instruction>(args: {
  rpc: SolRpc
  instruction: T
  hookProgramId: Address
  source: Address
  mint: Address
  destination: Address
  authority: Address
  amount: bigint
}): Promise<T> => {
  const { rpc, instruction, hookProgramId, source, mint, destination, authority, amount } = args

  const validateStateAddress = await getExtraAccountMetaAddress(mint, hookProgramId)
  const validateStateData = await getAccountData(rpc, validateStateAddress)
  if (!validateStateData) return instruction

  const extraMetas = getExtraAccountMetas(validateStateData)

  // resolution happens against the hook's `Execute` instruction, not the transfer instruction
  const executeData = new Uint8Array(16)
  executeData.set(EXECUTE_DISCRIMINATOR, 0)
  new DataView(executeData.buffer).setBigUint64(8, amount, true)

  const executeMetas: ResolvedMeta[] = [
    source,
    mint,
    destination,
    authority,
    validateStateAddress,
  ].map((address) => ({ address, isSigner: false, isWritable: false }))

  for (const extraMeta of extraMetas) {
    const resolved = await resolveExtraAccountMeta(
      rpc,
      extraMeta,
      executeMetas,
      executeData,
      hookProgramId
    )
    executeMetas.push(deEscalate(resolved, executeMetas))
  }

  const extraAccounts: AccountMeta[] = [
    // only the extra accounts resolved from the validation state
    ...executeMetas.slice(5).map((meta) => ({ address: meta.address, role: toAccountRole(meta) })),
    // then the transfer hook program and the validation state account
    { address: hookProgramId, role: AccountRole.READONLY },
    { address: validateStateAddress, role: AccountRole.READONLY },
  ]

  return {
    ...instruction,
    accounts: [...(instruction.accounts ?? []), ...extraAccounts],
  }
}
