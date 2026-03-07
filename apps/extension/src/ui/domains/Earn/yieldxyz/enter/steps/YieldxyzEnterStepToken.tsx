import type { Token } from "@talismn/chaindata-provider"
import { TokenPicker } from "@ui/domains/Asset/TokenPicker"
import { WizardModalDialog } from "@ui/talisman-ui/components/WizardModalDialog"
import { type FC, useCallback } from "react"
import { useTranslation } from "react-i18next"

import { useYieldxyzEnterModal } from "../useYieldxyzEnterModal"
import { useYieldxyzEnterWizard } from "../useYieldxyzEnterWizard"

export const YieldxyzEnterStepToken: FC = () => {
  const { t } = useTranslation()
  const { close } = useYieldxyzEnterModal()
  const { pickerTokenIds, pickerTokenId, onPickerTokenChanged } = useYieldxyzEnterWizard()

  const tokenFilter = useCallback(
    (token: Token): boolean => {
      if (!pickerTokenIds) return false // safety check to block user, this should not happen
      return pickerTokenIds.includes(token.id)
    },
    [pickerTokenIds]
  )

  if (!pickerTokenIds) throw new Error("PickerTokenIds is not defined")

  return (
    <WizardModalDialog
      className="size-full border-none"
      title={t("Select Token")}
      contentClassName="p-0"
      onCloseClick={close}
    >
      <TokenPicker
        tokenFilter={tokenFilter}
        allowUntransferable={false}
        ownedOnly
        selected={pickerTokenId ?? undefined}
        onSelect={onPickerTokenChanged}
      />
    </WizardModalDialog>
  )
}
