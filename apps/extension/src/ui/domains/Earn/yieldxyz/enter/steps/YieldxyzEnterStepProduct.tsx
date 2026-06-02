import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { useToken } from "@ui/state/chaindata"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { EarnOpportunityPicker } from "../../../components/EarnOpportunityPicker"
import type { YieldxyzEarnOpportunity } from "../../../hooks/useEarnOpportunitiesByTokenId"
import type { EarnOpportunity } from "../../../types"
import { useYieldxyzOpportunitiesForTokenId } from "../../hooks/useYieldxyzOpportunitiesForTokenId"
import { useYieldxyzEnterModal } from "../useYieldxyzEnterModal"
import { useYieldxyzEnterWizard } from "../useYieldxyzEnterWizard"

export const YieldxyzEnterStepProduct: FC = () => {
  const { t } = useTranslation()
  const { close } = useYieldxyzEnterModal()
  const { pickerTokenId, onProductChanged, productId, canGoBack, goBack, discoverOnly } =
    useYieldxyzEnterWizard()

  if (!pickerTokenId) throw new Error("PickerTokenId is not defined")

  const token = useToken(pickerTokenId)
  const products = useYieldxyzOpportunitiesForTokenId(pickerTokenId)

  const opportunities = useMemo<EarnOpportunity[]>(
    () =>
      products.map(
        (product) =>
          ({
            id: `yieldxyz-${product.id}`,
            system: "yieldxyz",
            providerId: product.providerId,
            providerLogoURI: null,
            tokenId: pickerTokenId,
            networkId: pickerTokenId.split(":")[0],
            title: product.metadata.name,
            type: product.mechanics.type,
            apr: product.rewardRate.total * 100,
            searchTerms: [product.id, ...(product.tags ?? [])],
            product,
          }) satisfies YieldxyzEarnOpportunity
      ),
    [products, pickerTokenId]
  )

  const disabledReason = useMemo(
    () =>
      discoverOnly ? t("You do not have any {{symbol}}", { symbol: token?.symbol ?? "" }) : null,
    [discoverOnly, token?.symbol, t]
  )

  return (
    <WizardModalDialog
      className="size-full border-none"
      title={t("Select Yield Opportunity")}
      contentClassName="p-0"
      onCloseClick={close}
      onBackClick={canGoBack ? goBack : undefined}
    >
      <EarnOpportunityPicker
        opportunities={opportunities}
        selectedId={productId ? `yieldxyz-${productId}` : null}
        onSelect={(opportunity) =>
          onProductChanged((opportunity as YieldxyzEarnOpportunity).product.id)
        }
        disabledReason={disabledReason}
      />
    </WizardModalDialog>
  )
}
