import { classNames, encodeAnyAddress } from "@talismn/util"
import { FC, useMemo } from "react"

import { WithTooltip } from "@talisman/components/Tooltip"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { useOnChainId } from "@ui/hooks/useOnChainId"
import { useChainByGenesisHash } from "@ui/state"

type AddressProps = {
  address?: string
  genesisHash?: string | null
  startCharCount?: number
  endCharCount?: number
  as?: "span" | "div"
  className?: string
  noTooltip?: boolean
  noOnChainId?: boolean
  noShorten?: boolean
}

export const Address: FC<AddressProps> = ({
  address,
  genesisHash,
  startCharCount = 4,
  endCharCount = 4,
  as: Component = "span",
  className,
  noTooltip,
  noOnChainId,
  noShorten,
}) => {
  // if we're not in a popup, no need to wrap
  const noWrap = useMemo(() => !document.getElementById("main"), [])

  const chain = useChainByGenesisHash(genesisHash)

  // if address has an onChainId, show that instead of the shortenedAddress
  const [onChainId] = useOnChainId(address)
  const formatted = useMemo(() => {
    if (!noOnChainId && onChainId) return onChainId
    const addressWithPrefix =
      address && chain ? encodeAnyAddress(address, chain.prefix ?? 42) : address
    if (noShorten) return addressWithPrefix
    if (!addressWithPrefix) return addressWithPrefix
    return shortenAddress(addressWithPrefix, startCharCount, endCharCount)
  }, [noOnChainId, onChainId, address, chain, noShorten, startCharCount, endCharCount])
  if (!formatted) return null

  const display = (
    <span
      className={classNames(
        // don't wrap shortenedAddresses onto two lines when low on space
        // e.g. `0x00…0000` -> `0x00…\n0000`
        !onChainId && "whitespace-nowrap",
      )}
    >
      {formatted}
    </span>
  )

  if (noTooltip) return <Component className={className}>{display}</Component>
  return (
    <WithTooltip as={Component} className={className} tooltip={address} noWrap={noWrap}>
      {display}
    </WithTooltip>
  )
}
