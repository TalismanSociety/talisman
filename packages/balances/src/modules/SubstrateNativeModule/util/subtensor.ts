import { toHex } from "@polkadot-api/utils"
import { AccountId } from "polkadot-api"
import { bool, Bytes, compact, Option as ScaleOption, Struct, Vector } from "scale-ts"

export const SUBTENSOR_ROOT_NETUID = 0
export const SUBTENSOR_MIN_STAKE_AMOUNT_PLANK = 1000000n
const SCALE_FACTOR = 10n ** 9n // Equivalent to 1e9 for precision

const BittensorAccountPrefix = 42
const BittensorAccountId = AccountId(BittensorAccountPrefix)

/** For encoding/decoding the GetStakeInfoForColdkey runtime api *after* they added the netuid parameter */
const StakeInfo = Struct({
  hotkey: BittensorAccountId,
  coldkey: BittensorAccountId,
  netuid: compact,
  stake: compact,
  locked: compact,
  emission: compact,
  tao_emission: compact,
  drain: compact,
  isRegistered: bool,
})

export const EncodeParams_GetStakeInfoForColdkey = (address: string) =>
  toHex(BittensorAccountId.enc(address))
export const DecodeResult_GetStakeInfoForColdkey = (result: string) => Vector(StakeInfo).dec(result)
/** Encoding/decoding for GetStakeDynamicInfo */
export const EncodeParams_GetDynamicInfo = (netuid: number): string => {
  if (netuid < 0 || netuid > 65535) {
    throw new Error("netuid must be a valid u16 (0-65535)")
  }

  // Convert the number to a Uint8Array (LE encoding)
  const encoded = new Uint8Array(2)
  encoded[0] = netuid & 0xff // Lower byte
  encoded[1] = (netuid >> 8) & 0xff // Upper byte

  // Convert to hex string
  return toHex(encoded)
}
/** I96F32 representation (Fixed-Point) */
const I96F32 = Struct({
  bits: compact,
})

const SubnetIdentityV2 = Struct({
  subnetName: Bytes(),
  githubRepo: Bytes(),
  subnetContact: Bytes(),
  subnetUrl: Bytes(),
  discord: Bytes(),
  description: Bytes(),
})

const DynamicInfo = Struct({
  netuid: compact,
  ownerHotkey: BittensorAccountId,
  ownerColdkey: BittensorAccountId,
  subnetName: Vector(compact),
  tokenSymbol: Vector(compact),
  tempo: compact,
  lastStep: compact,
  blocksSinceLastStep: compact,
  emission: compact,
  alphaIn: compact,
  alphaOut: compact,
  taoIn: compact,
  alphaOutEmission: compact,
  alphaInEmission: compact,
  taoInEmission: compact,
  pendingAlphaEmission: compact,
  pendingRootEmission: compact,
  subnetVolume: compact,
  networkRegisteredAt: compact,
  subnetIdentity: ScaleOption(SubnetIdentityV2),
  movingPrice: I96F32,
})

export type DynamicInfoType = ReturnType<typeof DecodeResult_GetDynamicInfo>

export const DecodeResult_GetDynamicInfo = (result: string) => {
  const LITTLE_ENDIAN_OFFSET = 256
  const decoded = DynamicInfo.dec(result)

  const {
    netuid: netuidLittleEndian,
    subnetIdentity: subnetIdentityScaleOption = {},
    tokenSymbol: tokenSymbolU8Arr,
    taoIn,
    alphaIn,
    subnetName: subnetNameVector,
  } = decoded

  const netuid = Number(netuidLittleEndian) / LITTLE_ENDIAN_OFFSET
  const tokenSymbol = new TextDecoder().decode(
    Uint8Array.from(tokenSymbolU8Arr.map((val) => Number(val))),
  )
  const subnetName = new TextDecoder().decode(
    Uint8Array.from(subnetNameVector.map((val) => Number(val))),
  )
  const subnetIdentity = Object.keys(
    subnetIdentityScaleOption as Record<string, Uint8Array>,
  ).reduce(
    (acc, key) => {
      const value = (subnetIdentityScaleOption as Record<string, Uint8Array>)[key]
      acc[key] = new TextDecoder().decode(value)
      return acc
    },
    {} as Record<string, string>,
  )

  return {
    ...decoded,
    netuid,
    tokenSymbol,
    subnetIdentity,
    taoIn: BigInt(taoIn),
    alphaIn: BigInt(alphaIn),
    subnetName,
  }
}

export const calculateAlphaPrice = ({
  dynamicInfo,
}: {
  dynamicInfo: DynamicInfoType | void | null
}): bigint => {
  if (!dynamicInfo) return 0n

  const { alphaIn, taoIn } = dynamicInfo

  // Scale taoIn before division to preserve precision
  const result = (taoIn * SCALE_FACTOR) / alphaIn

  return result // Scaled price as bigint
}

const calculateTaoAmountFromAlpha = ({
  alphaPrice,
  alphaStaked,
}: {
  alphaPrice: bigint
  alphaStaked: bigint
}): bigint => {
  if (!alphaStaked || !alphaPrice) return 0n
  const expectedAlpha = alphaStaked * alphaPrice

  return expectedAlpha / SCALE_FACTOR
}

export const calculateTaoFromDynamicInfo = ({
  dynamicInfo,
  alphaStaked,
}: {
  dynamicInfo: DynamicInfoType | void | null
  alphaStaked: bigint
}): bigint => {
  const alphaPrice = calculateAlphaPrice({ dynamicInfo })

  return calculateTaoAmountFromAlpha({ alphaPrice, alphaStaked })
}
