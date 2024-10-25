import { u8aConcat, u8aToHex } from "@polkadot/util"
import { blake2AsU8a } from "@polkadot/util-crypto"
import { u32 } from "scale-ts"

/**
 * Crowdloan contributions are stored in the `childstate` key returned by this function.
 */
export const crowdloanFundContributionsChildKey = (fundIndex: number) =>
  u8aToHex(
    u8aConcat(":child_storage:default:", blake2AsU8a(u8aConcat("crowdloan", u32.enc(fundIndex)))),
  )
