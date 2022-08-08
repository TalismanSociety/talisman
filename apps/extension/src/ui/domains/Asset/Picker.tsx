import { TokenId } from "@core/domains/tokens/types"
import useChains from "@ui/hooks/useChains"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import { FC } from "react"

import GenericPicker, { PickerItemProps } from "./GenericPicker"
import { useSortedTransferableTokens, useTransferableTokens } from "./Send/useTransferableTokens"
import { TokenLogo } from "./TokenLogo"

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
      evmNetwork && (chain?.evmNetworks?.length || !!evmNetwork?.substrateChain) ? " (EVM)" : ""
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
    />
  )
}

export default AssetPicker
