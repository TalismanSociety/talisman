import { ChainId, EvmNetworkId } from "@talismn/chaindata-provider"
import { CopyIcon } from "@talismn/icons"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useSetting } from "@ui/hooks/useSettings"
import useTokens from "@ui/hooks/useTokens"
import { useCallback } from "react"

import { useSelectedAccount } from "../useSelectedAccount"

export const CopyAddressButton = ({
  symbol,
  networkId,
}: {
  symbol: string
  networkId: ChainId | EvmNetworkId | null | undefined
}) => {
  const { account } = useSelectedAccount()
  const [includeTestnets] = useSetting("useTestnets")
  const { tokens } = useTokens({ activeOnly: true, includeTestnets })

  const token = tokens?.find(
    (t) =>
      t.symbol === symbol &&
      (("evmNetwork" in t && t.evmNetwork?.id === networkId) || t.chain?.id === networkId)
  )

  const { genericEvent } = useAnalytics()
  const { open } = useCopyAddressModal()

  const handleClick = useCallback(() => {
    open({
      address: account?.address,
      chainId: token?.chain?.id,
    })
    genericEvent("open receive", { from: "asset details" })
  }, [account?.address, genericEvent, open, token?.chain?.id])

  if (!token) return null

  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-body-secondary hover:text-body focus:text-body focus:bg-grey-700 hover:bg-grey-700 inline-flex h-9 w-9 items-center justify-center rounded-full text-xs"
    >
      <CopyIcon />
    </button>
  )
}
