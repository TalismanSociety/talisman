import {
  type BitcoinAddressType,
  deriveBitcoinAddressFromXpub,
  encodeAnyAddress,
  getXpubPrefix,
  isBitcoinXpub,
} from "@talismn/crypto"
import { WithTooltip } from "@ui/components/WithTooltip"
import { useOnChainId } from "@ui/hooks/useOnChainId"
import { useAccountByAddress } from "@ui/state/accounts"
import { useNetworkByGenesisHash } from "@ui/state/chaindata"
import { cn } from "@ui/util/cn"
import { shortenAddress } from "@ui/util/shortenAddress"
import { type FC, useMemo } from "react"

/** watched xpubs carry an explicit script type — other bitcoin accounts identify by their payments (P2WPKH) xpub */
export const getAccountBtcAddressType = (
  account: { type: string; addressType?: BitcoinAddressType } | null | undefined
): BitcoinAddressType | undefined =>
  account?.type === "watch-only-bitcoin" ? account.addressType : undefined

// bitcoin account identities are xpubs, which must never be shown as a payable
// address — display the first address of the tracked tree instead. The SLIP-132
// prefix pins the network (tpub/upub/vpub = testnet) and, for zpub/vpub, the
// script type; a plain xpub needs the account's stored addressType.
export const getBitcoinDisplayAddress = (xpub: string, addressType?: BitcoinAddressType) => {
  try {
    const prefix = getXpubPrefix(xpub)
    const hrp = prefix === "tpub" || prefix === "upub" || prefix === "vpub" ? "tb" : "bc"
    const type =
      addressType ?? (prefix === "zpub" || prefix === "vpub" ? "p2wpkh" : undefined) ?? "p2wpkh"
    return deriveBitcoinAddressFromXpub(xpub, type, 0, 0, hrp)
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
  const account = useAccountByAddress(address ?? null)

  // if address has an onChainId, show that instead of the shortenedAddress
  const [onChainId] = useOnChainId(address)
  const [formatted, tooltip] = useMemo(() => {
    const fullAddress =
      address && isBitcoinXpub(address)
        ? getBitcoinDisplayAddress(address, getAccountBtcAddressType(account))
        : address && chain
          ? encodeAnyAddress(address, { ss58Format: chain.prefix })
          : address
    // never leak the xpub, even in a tooltip
    const tooltip = address && isBitcoinXpub(address) ? fullAddress : address
    if (!noOnChainId && onChainId) return [onChainId, tooltip]
    if (noShorten || !fullAddress) return [fullAddress, tooltip]
    return [shortenAddress(fullAddress, startCharCount, endCharCount), tooltip]
  }, [noOnChainId, onChainId, address, account, chain, noShorten, startCharCount, endCharCount])
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
