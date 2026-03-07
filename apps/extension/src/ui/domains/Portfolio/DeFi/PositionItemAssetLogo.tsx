import type { DefiPositionItem } from "@core/domains/defi/exports"
import { evmErc20TokenId, useTokensById } from "@talismn/balances-react"
import { evmNativeTokenId, solNativeTokenId, solSplTokenId } from "@talismn/chaindata-provider"
import { isHexString } from "@talismn/util"
import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { type FC, useMemo } from "react"

export const PositionItemAssetLogo: FC<{
  networkId: string
  item: DefiPositionItem
  className?: string
}> = ({ networkId, item, className }) => {
  const tokensById = useTokensById()

  // prioritize talisman logo for consistency
  const token = useMemo(() => {
    if (isHexString(item.contract_address)) {
      return tokensById[evmErc20TokenId(networkId, item.contract_address)]
    } else if (item.contract_address) {
      return tokensById[solSplTokenId(networkId, item.contract_address)]
    } else {
      return (
        tokensById[evmNativeTokenId(networkId)] ?? tokensById[solNativeTokenId(networkId)] ?? null
      )
    }
  }, [networkId, item, tokensById])

  return <AssetLogo url={token?.logo ?? item.logo} className={className} />
}
