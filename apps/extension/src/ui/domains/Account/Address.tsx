import { deriveBitcoinAddressFromXpub, encodeAnyAddress, isBitcoinXpub } from "@talismn/crypto"
import { WithTooltip } from "@ui/components/WithTooltip"
import { useOnChainId } from "@ui/hooks/useOnChainId"
import { useNetworkByGenesisHash } from "@ui/state/chaindata"
import { cn } from "@ui/util/cn"
import { shortenAddress } from "@ui/util/shortenAddress"
import { type FC, useMemo } from "react"

// bitcoin account identities are xpubs, which must never be shown as a payable
// address — display the first payments (P2WPKH) address instead
export const getBitcoinDisplayAddress = (xpub: string) => {
  try {
    return deriveBitcoinAddressFromXpub(xpub, "p2wpkh", 0, 0)
  } catch {
    return null
  }
}

type AddressProps = {
  address?: string
  genesisHash?: `0x${string}` | null
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

  const chain = useNetworkByGenesisHash(genesisHash)

  // if address has an onChainId, show that instead of the shortenedAddress
  const [onChainId] = useOnChainId(address)
  const [formatted, tooltip] = useMemo(() => {
    const fullAddress =
      address && isBitcoinXpub(address)
        ? getBitcoinDisplayAddress(address)
        : address && chain
          ? encodeAnyAddress(address, { ss58Format: chain.prefix })
          : address
    // never leak the xpub, even in a tooltip
    const tooltip = address && isBitcoinXpub(address) ? fullAddress : address
    if (!noOnChainId && onChainId) return [onChainId, tooltip]
    if (noShorten || !fullAddress) return [fullAddress, tooltip]
    return [shortenAddress(fullAddress, startCharCount, endCharCount), tooltip]
  }, [noOnChainId, onChainId, address, chain, noShorten, startCharCount, endCharCount])
  if (!formatted) return null

  const display = (
    <span
      className={cn(
        // don't wrap shortenedAddresses onto two lines when low on space
        // e.g. `0x00…0000` -> `0x00…\n0000`
        !onChainId && "whitespace-nowrap"
      )}
    >
      {formatted}
    </span>
  )

  if (noTooltip) return <Component className={className}>{display}</Component>
  return (
    <WithTooltip as={Component} className={className} tooltip={tooltip} noWrap={noWrap}>
      {display}
    </WithTooltip>
  )
}
