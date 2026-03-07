import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import type { NetworkId } from "@talismn/chaindata-provider"
import { CopyIcon } from "@talismn/icons"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/talisman-ui/components/Tooltip"
import { type FC, Suspense, useCallback } from "react"
import { useTranslation } from "react-i18next"

import { usePortfolioNavigation } from "../usePortfolioNavigation"

type CopyAddressButtonProps = {
  networkId: NetworkId | null | undefined
}

const CopyAddressButtonInner: FC<CopyAddressButtonProps> = ({ networkId }) => {
  const { t } = useTranslation()
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
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleClick}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xs text-body-secondary text-xs hover:bg-grey-700 hover:text-body focus:bg-grey-700 focus:text-body"
        >
          <CopyIcon />
        </button>
      </TooltipTrigger>
      <TooltipContent>{t("Copy Address")}</TooltipContent>
    </Tooltip>
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
