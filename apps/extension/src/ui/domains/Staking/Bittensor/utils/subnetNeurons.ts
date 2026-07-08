import { isAddressEqual } from "@talismn/crypto"
import { Binary } from "@polkadot-api/substrate-bindings"

export type NeuronRole = "owner" | "validator" | "miner"

export type SubnetNeuron = {
  hotkey: string
  coldkey: string
  uid: number
  /** per-neuron alpha stake on THIS subnet, in planck */
  stakeOnSubnet: bigint
  role: NeuronRole
  /** resolved display name (on-chain identity → validator registry → null); UI shows short address on null */
  name: string | null
}

/**
 * Decoded shape of `SubnetInfoRuntimeApi.get_metagraph(netuid)` — only the columns we read.
 * The metagraph is columnar: every per-neuron field is an array indexed by uid.
 */
export type Metagraph =
  | {
      num_uids: number
      owner_hotkey: string
      hotkeys: string[]
      coldkeys: string[]
      validator_permit: boolean[]
      alpha_stake: bigint[]
      identities: Array<{ name: Uint8Array } | undefined>
    }
  | undefined

/** Account-independent rows; the display name is enriched by the hook. */
export type RawNeuron = Omit<SubnetNeuron, "name"> & {
  onChainName: string | null
}

export const cleanName = (raw: string | null | undefined): string | null => {
  const trimmed = raw?.trim()
  return trimmed ? trimmed : null
}

/**
 * Flattens the columnar metagraph into one row per neuron. Role precedence is owner > validator >
 * miner (a hotkey can be both the owner and a validator; the owner badge wins). Columns are
 * index-aligned by uid; we clamp to the shortest authoritative length and tolerate gaps.
 */
export const normalizeMetagraph = (mg: Metagraph): RawNeuron[] => {
  if (!mg) return []
  const count = Math.min(mg.num_uids ?? mg.hotkeys.length, mg.hotkeys.length)
  const rows: RawNeuron[] = []
  for (let uid = 0; uid < count; uid++) {
    const hotkey = mg.hotkeys[uid]
    if (!hotkey) continue

    // on-chain identity name is a Binary; some blobs decode to garbage, so guard
    let onChainName: string | null = null
    try {
      const identityName = mg.identities[uid]?.name
      onChainName = cleanName(identityName ? Binary.toText(identityName) : undefined)
    } catch {
      onChainName = null
    }

    const role: NeuronRole = isAddressEqual(hotkey, mg.owner_hotkey)
      ? "owner"
      : mg.validator_permit[uid]
        ? "validator"
        : "miner"

    rows.push({
      hotkey,
      coldkey: mg.coldkeys[uid] ?? "",
      uid,
      stakeOnSubnet: mg.alpha_stake[uid] ?? 0n,
      role,
      onChainName,
    })
  }
  return rows
}
