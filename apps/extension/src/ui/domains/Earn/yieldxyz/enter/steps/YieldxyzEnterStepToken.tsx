import { Token } from "@talismn/chaindata-provider"
import { FC, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { WizardModalDialog } from "talisman-ui"

import { TokenPicker } from "@ui/domains/Asset/TokenPicker"

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
    [pickerTokenIds],
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
