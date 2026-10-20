import {
  networkIdForAnalytics,
  tokenIdForAnalytics,
  tokenSymbolForAnalytics,
} from "@common/analytics/funds"
import type { Token, TokenId } from "@talismn/chaindata-provider"
import { track } from "@ui/api/track"
import { ModalDialog } from "@ui/components/ModalDialog"
import { type TokenPick, TokenPicker } from "@ui/domains/Asset/TokenPicker"
import { useNetworksMapById, useTokensMap } from "@ui/state/chaindata"
import { type FC, useCallback } from "react"
import { useTranslation } from "react-i18next"

import { useYieldxyzEnterModal } from "../useYieldxyzEnterModal"
import { useYieldxyzEnterWizard } from "../useYieldxyzEnterWizard"

export const YieldxyzEnterStepToken: FC = () => {
  const { t } = useTranslation()
  const { close } = useYieldxyzEnterModal()
  const { pickerTokenIds, pickerTokenId, onPickerTokenChanged } = useYieldxyzEnterWizard()
  const tokensMap = useTokensMap()
  const networksMap = useNetworksMapById()

  const handleSelect = useCallback(
    (tokenId: TokenId, pick: TokenPick) => {
      const token = tokensMap[tokenId]
      track("earn_token_selected", {
        searched: pick.searched,
        position: pick.position,
        token_id: tokenIdForAnalytics(token),
        symbol: tokenSymbolForAnalytics(token),
        network_id: networkIdForAnalytics(token && networksMap[token.networkId]),
      })
      onPickerTokenChanged(tokenId)
    },
    [onPickerTokenChanged, tokensMap, networksMap]
  )

  const tokenFilter = useCallback(
    (token: Token): boolean => {
      if (!pickerTokenIds) return false // safety check to block user, this should not happen
      return pickerTokenIds.includes(token.id)
    },
    [pickerTokenIds]
  )

  if (!pickerTokenIds) throw new Error("PickerTokenIds is not defined")

  return (
    <ModalDialog
      variant="wizard"
      className="size-full border-none"
      title={t("Select Token")}
      contentClassName="p-0"
      onCloseClick={close}
    >
      <TokenPicker
        tokenFilter={tokenFilter}
        selected={pickerTokenId ?? undefined}
        onSelect={handleSelect}
      />
    </ModalDialog>
  )
}
