import { ChainId, EvmNetworkId } from "@talismn/chaindata-provider"
import { CopyIcon } from "@talismn/icons"
import { FC, Suspense, useCallback } from "react"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import { useAnalytics } from "@ui/hooks/useAnalytics"

import { usePortfolioNavigation } from "../usePortfolioNavigation"

type CopyAddressButtonProps = {
  networkId: ChainId | EvmNetworkId | null | undefined
}

const CopyAddressButtonInner: FC<CopyAddressButtonProps> = ({ networkId }) => {
  const { selectedAccount } = usePortfolioNavigation()
  const { genericEvent } = useAnalytics()
  const { open } = useCopyAddressModal()

  const handleClick = useCallback(() => {
    open({
      address: selectedAccount?.address,
      networkId,
    })
    genericEvent("open receive", { from: "asset details" })
  }, [selectedAccount?.address, genericEvent, open, networkId])

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

export const CopyAddressButton: FC<CopyAddressButtonProps> = ({ networkId }) => (
  <Suspense
    fallback={
      <>
        <div className="inline-block h-9 w-9"></div>
        <SuspenseTracker name="CopyAddressButton" />
      </>
    }
  >
    <CopyAddressButtonInner networkId={networkId} />
  </Suspense>
)
