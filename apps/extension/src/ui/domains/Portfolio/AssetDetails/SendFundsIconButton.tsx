import { PaperPlaneIcon } from "@talisman/theme/icons"
import { ChainId, EvmNetworkId } from "@talismn/chaindata-provider"
import { api } from "@ui/api"
import { useSetting } from "@ui/hooks/useSettings"
import useTokens from "@ui/hooks/useTokens"
import { useCallback } from "react"

import { useSelectedAccount } from "../SelectedAccountContext"

export const SendFundsButton = ({
  symbol,
  networkId,
  shouldClose,
}: {
  symbol: string
  networkId: ChainId | EvmNetworkId
  shouldClose?: boolean
}) => {
  const { account } = useSelectedAccount()
  const [useTestnets] = useSetting("useTestnets")
  const { tokens } = useTokens(useTestnets)

  const token = tokens?.find(
    (t) =>
      t.symbol === symbol &&
      (("evmNetwork" in t && t.evmNetwork?.id === networkId) || t.chain?.id === networkId)
  )

  const handleClick = useCallback(() => {
    if (!token) return
    api.sendFundsOpen({
      from: account?.address,
      tokenId: token.id,
    })
    if (shouldClose) window.close()
  }, [account?.address, shouldClose, token])

  if (!token) return null

  return (
    <button
      onClick={handleClick}
      className="text-body-secondary hover:text-body focus:text-body focus:bg-grey-700 hover:bg-grey-700 inline-flex h-9 w-9 items-center justify-center rounded-full text-xs"
    >
      <PaperPlaneIcon />
    </button>
  )
}
