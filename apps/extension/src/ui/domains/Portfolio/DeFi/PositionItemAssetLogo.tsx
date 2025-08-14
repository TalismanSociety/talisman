import { evmErc20TokenId, useTokensById } from "@talismn/balances-react"
import { evmNativeTokenId, solNativeTokenId, solSplTokenId } from "@talismn/chaindata-provider"
import { isHexString } from "@talismn/util"
import { DefiPositionItem } from "extension-core"
import { FC, useMemo } from "react"

import { AssetLogo } from "@ui/domains/Asset/AssetLogo"

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
