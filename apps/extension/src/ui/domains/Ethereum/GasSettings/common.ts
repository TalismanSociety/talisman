import { EthPriorityOptionName } from "@core/domains/signing/types"
import imgFeePriorityCustom from "@talisman/theme/images/fee-priority-custom.png"
import imgFeePriorityHigh from "@talisman/theme/images/fee-priority-high.png"
import imgFeePriorityLow from "@talisman/theme/images/fee-priority-low.png"
import imgFeePriorityMedium from "@talisman/theme/images/fee-priority-medium.png"

export const FEE_PRIORITY_OPTIONS: Record<EthPriorityOptionName, { icon: string; label: string }> =
  {
    low: { icon: imgFeePriorityLow, label: "Low" },
    medium: { icon: imgFeePriorityMedium, label: "Normal" },
    high: { icon: imgFeePriorityHigh, label: "Urgent" },
    custom: { icon: imgFeePriorityCustom, label: "Custom" },
  }
