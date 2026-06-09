import type { SignerPayloadJSON } from "@core/domains/signing/types"
import type { DotNetworkId } from "@talismn/chaindata-provider"
import { AlertCircleIcon } from "@talismn/icons"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { BittensorValidatorName } from "@ui/domains/Portfolio/AssetDetails/DashboardTokenBalances/BittensorValidatorName"
import { StakingAccountDisplay } from "@ui/domains/Staking/shared/StakingAccountDisplay"
import { StakingFeeEstimate } from "@ui/domains/Staking/shared/StakingFeeEstimate"
import { SapiSendButton } from "@ui/domains/Transactions/SapiSendButton"
import { cn } from "@ui/util/cn"
import type { FC } from "react"
import { useTranslation } from "react-i18next"
import type { Hex } from "viem"

import {
  BITTENSOR_CHANGE_LOCK_HOTKEY_MODAL_CONTAINER_ID,
  type ConvictionMoveOutcome,
} from "./BittensorChangeLockHotkeyContent"

type BittensorChangeLockHotkeyConfirmProps = {
  networkId: DotNetworkId
  address: string
  currentHotkey: string
  destinationHotkey: string
  /** the resolved conviction consequence of the move, surfaced as the confirm-step notice */
  convictionOutcome: ConvictionMoveOutcome
  lockedAmount: bigint
  symbol: string
  tokenId: string
  taoTokenId: string | null | undefined
  payload: SignerPayloadJSON | undefined
  txMetadata: Uint8Array | `0x${string}` | undefined
  feeEstimate?: bigint | null
  isLoadingFeeEstimate?: boolean
  errorFeeEstimate?: unknown
  onBack: () => void
  onClose: () => void
  onSubmitted: (hash: Hex) => void
}

const HotkeyDisplay: FC<{ hotkey: string }> = ({ hotkey }) => (
  <span className="inline-flex max-w-full items-center gap-4 overflow-hidden align-middle">
    <AccountIcon className="shrink-0 text-lg!" address={hotkey} />
    <BittensorValidatorName hotkey={hotkey} className="truncate" />
  </span>
)

const SummaryRow: FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex h-10 items-center justify-between gap-8">
    <span className="whitespace-nowrap text-body-secondary">{label}</span>
    <span className="truncate text-body">{children}</span>
  </div>
)

export const BittensorChangeLockHotkeyConfirm: FC<BittensorChangeLockHotkeyConfirmProps> = ({
  networkId,
  address,
  currentHotkey,
  destinationHotkey,
  convictionOutcome,
  lockedAmount,
  symbol,
  tokenId,
  taoTokenId,
  payload,
  txMetadata,
  feeEstimate,
  isLoadingFeeEstimate,
  errorFeeEstimate,
  onBack,
  onClose,
  onSubmitted,
}) => {
  const { t } = useTranslation()

  // the conviction consequence is the headline of this step: a hard warning when it resets, a calm
  // note when it's preserved or boosted. Either way, spell out that only the hotkey moves.
  const convictionNotice =
    convictionOutcome === "reset"
      ? {
          isWarning: true,
          text: t(
            "This resets your accumulated conviction to zero — the new hotkey is owned by a different coldkey than the current one. The locked {{symbol}} stays locked and only the hotkey changes; your stake and rewards don't move.",
            { symbol }
          ),
        }
      : convictionOutcome === "instant-full"
        ? {
            isWarning: false,
            text: t(
              "The new hotkey is the subnet owner, which is granted instant full conviction. The locked {{symbol}} stays locked and only the hotkey changes; your stake and rewards don't move.",
              { symbol }
            ),
          }
        : {
            isWarning: false,
            text: t(
              "Both hotkeys share the same owner, so your accumulated conviction carries over. The locked {{symbol}} stays locked and only the hotkey changes; your stake and rewards don't move.",
              { symbol }
            ),
          }

  return (
    <WizardModalDialog
      title={t("Change hotkey")}
      contentClassName="size-full flex flex-col overflow-hidden"
      onBackClick={onBack}
      onCloseClick={onClose}
    >
      <ScrollContainer className="grow" innerClassName="flex w-full flex-col gap-8">
        <h2 className="mb-4 text-center font-bold text-md">{t("Review transaction")}</h2>

        <div className="flex flex-col gap-4 rounded bg-grey-900 px-8 py-6 text-sm">
          <SummaryRow label={t("Account")}>
            <StakingAccountDisplay address={address} chainId={networkId} className="text-sm" />
          </SummaryRow>
          <SummaryRow label={t("Current hotkey")}>
            <HotkeyDisplay hotkey={currentHotkey} />
          </SummaryRow>
          <SummaryRow label={t("New hotkey")}>
            <HotkeyDisplay hotkey={destinationHotkey} />
          </SummaryRow>
          <SummaryRow label={t("Locked amount")}>
            <TokensAndFiat
              planck={lockedAmount}
              tokenId={tokenId}
              noCountUp
              tokensClassName="text-body"
            />
          </SummaryRow>
          <SummaryRow label={t("Network fee")}>
            <StakingFeeEstimate
              plancks={feeEstimate}
              tokenId={taoTokenId}
              isLoading={isLoadingFeeEstimate}
              error={errorFeeEstimate}
              noCountUp
            />
          </SummaryRow>
        </div>

        <div
          className={cn(
            "flex items-start gap-4 rounded px-8 py-6 text-xs",
            convictionNotice.isWarning
              ? "bg-alert-warn/10 text-alert-warn"
              : "bg-grey-800 text-body-secondary"
          )}
        >
          <AlertCircleIcon className="mt-0.5 shrink-0 text-sm" />
          <span>{convictionNotice.text}</span>
        </div>
      </ScrollContainer>

      <SapiSendButton
        containerId={BITTENSOR_CHANGE_LOCK_HOTKEY_MODAL_CONTAINER_ID}
        label={t("Confirm")}
        payload={payload}
        txMetadata={txMetadata}
        onSubmitted={onSubmitted}
        disabled={!payload}
        className="shrink-0"
      />
    </WizardModalDialog>
  )
}
