import { CopyIcon } from "@talisman/theme/icons"
import { ChainId, EvmNetworkId } from "@talismn/chaindata-provider"
import { useCopyAddressModal } from "@ui/domains/CopyAddress/useCopyAddressModal"
import { useSettings } from "@ui/hooks/useSettings"
import useTokens from "@ui/hooks/useTokens"
import { useCallback } from "react"

import { useSelectedAccount } from "../SelectedAccountContext"

export const CopyAddressButton = ({
  symbol,
  networkId,
}: {
  symbol: string
  networkId: ChainId | EvmNetworkId | null | undefined
}) => {
  const { account } = useSelectedAccount()
  const { useTestnets = false } = useSettings()
  const { tokens } = useTokens(useTestnets)

  const token = tokens?.find(
    (t) =>
      t.symbol === symbol &&
      (("evmNetwork" in t && t.evmNetwork?.id === networkId) || t.chain?.id === networkId)
  )

  const { open } = useCopyAddressModal()

  const handleClick = useCallback(() => {
    if (!token) return
    open({
      type: "token",
      address: account?.address,
      tokenId: token.id,
    })
  }, [account?.address, open, token])

  if (!token) return null

  return (
    <button
      onClick={handleClick}
      className="text-body-secondary hover:text-body focus:text-body focus:bg-grey-700 hover:bg-grey-700 inline-flex h-9 w-9 items-center justify-center rounded-full text-xs"
    >
      <CopyIcon />
    </button>
  )
}
