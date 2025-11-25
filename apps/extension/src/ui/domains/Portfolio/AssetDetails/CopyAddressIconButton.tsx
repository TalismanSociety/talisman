import { NetworkId } from "@talismn/chaindata-provider"
import { CopyIcon } from "@talismn/icons"
import { FC, Suspense, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import { useAnalytics } from "@ui/hooks/useAnalytics"

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
          className="text-body-secondary hover:text-body focus:text-body focus:bg-grey-700 hover:bg-grey-700 rounded-xs inline-flex h-9 w-9 items-center justify-center text-xs"
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
