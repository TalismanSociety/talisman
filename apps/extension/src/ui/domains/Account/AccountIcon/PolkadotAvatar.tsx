import { isSs58Address } from "@talismn/crypto"
import { type FC, useMemo } from "react"
import { BlockiesIdenticon } from "./BlockiesIdenticon"
import { PolkadotIdenticon } from "./PolkadotIdenticon"

export const PolkadotAvatar: FC<{
  address: string
  className?: string
}> = ({ address, className }) => {
  const isSs58 = useMemo(() => isSs58Address(address), [address])

  return isSs58 ? (
    <PolkadotIdenticon address={address} className={className} />
  ) : (
    <BlockiesIdenticon address={address} className={className} />
  )
}
