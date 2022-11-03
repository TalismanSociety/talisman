import { TokenId } from "@core/domains/tokens/types"
import useChains from "@ui/hooks/useChains"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import { FC } from "react"

import GenericPicker, { PickerItemProps } from "../../../@talisman/components/GenericPicker"
import { useSortedTransferableTokens } from "./Send/useTransferableTokens"
import { TokenLogo } from "./TokenLogo"

// Used to sort and filter tokens from the GenericPicker component
// Exclude (ethereum) as it's added on all ETH chains
// If an exact match is found in title or subtitle, it must be displayed first
const searchAccounts = (text: string | null, items: PickerItemProps[]) => {
  if (!text) return items
  const ls = text.toLowerCase()
  return (
    items
      .filter(
        (item) =>
          item.title?.toString().toLowerCase().includes(ls) ||
          (typeof item.subtitle === "string" &&
            item.subtitle.toLowerCase().replace("(ethereum)", "").includes(ls))
      )
      // Exact match on subtitle should come up first
      .sort((a, b) => {
        if (typeof a.subtitle === "string" && a.subtitle.toLowerCase() === ls) return -1
        if (typeof b.subtitle === "string" && b.subtitle.toLowerCase() === ls) return 1
        return 0 // no match, keep original order
      })
      // Exact match on title should come up first (this has priority over subtitle as it's done after)
      .sort((a, b) => {
        if (a.title?.toString().toLowerCase() === ls) return -1
        if (b.title?.toString().toLowerCase() === ls) return 1
        return 0 // no match, keep original order
      })
  )
}

interface IProps {
  defaultValue?: TokenId
  value?: TokenId
  onChange?: (tokenId: TokenId) => void
  className?: string
  showChainsWithBalanceFirst?: boolean
}

const AssetPicker: FC<IProps> = ({
  defaultValue,
  value,
  onChange,
  className,
  showChainsWithBalanceFirst,
}) => {
  const chains = useChains()
  const evmNetworks = useEvmNetworks()
  const transferableTokens = useSortedTransferableTokens(showChainsWithBalanceFirst)

  const items: PickerItemProps[] = transferableTokens.map((transferable) => {
    const { id, chainId, evmNetworkId, token } = transferable
    const chain = chains?.find((c) => c.id === chainId)
    const evmNetwork = evmNetworks?.find((n) => Number(n.id) === Number(evmNetworkId))
    const networkName = chain?.chainName || evmNetwork?.name
    // display type only if chain has an evm network, or vice versa
    const networkType =
      evmNetwork && (chain?.evmNetworks?.length || !!evmNetwork?.substrateChain)
        ? " (Ethereum)"
        : ""
    const subtitle = networkName + networkType
    return {
      id,
      logo: <TokenLogo tokenId={token.id} />,
      title: token.symbol,
      subtitle: subtitle,
    }
  })

  return (
    <GenericPicker
      className={className}
      items={items}
      onChange={onChange}
      value={value}
      defaultValue={defaultValue}
      search={searchAccounts}
    />
  )
}

export default AssetPicker
