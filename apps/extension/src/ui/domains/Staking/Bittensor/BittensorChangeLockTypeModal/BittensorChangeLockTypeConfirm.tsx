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
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { Hex } from "viem"

import { BITTENSOR_CHANGE_LOCK_TYPE_MODAL_CONTAINER_ID } from "./BittensorChangeLockTypeContent"

type BittensorChangeLockTypeConfirmProps = {
  networkId: DotNetworkId
  address: string
  hotkey: string
  lockedAmount: bigint
  currentIsPerpetual: boolean
  targetIsPerpetual: boolean
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

const SummaryRow: FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex h-10 items-center justify-between gap-8">
    <span className="whitespace-nowrap text-body-secondary">{label}</span>
    <span className="truncate text-body">{children}</span>
  </div>
)

export const BittensorChangeLockTypeConfirm: FC<BittensorChangeLockTypeConfirmProps> = ({
  networkId,
  address,
  hotkey,
  lockedAmount,
  currentIsPerpetual,
  targetIsPerpetual,
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

  // neither direction is destructive (the flip is reversible anytime): warn tint for both
  const warning = useMemo(
    () =>
      targetIsPerpetual
        ? t(
            "Switching to a perpetual lock stops the decay: your locked {{symbol}} stays at the full locked amount and won't become unstakable while perpetual. You can switch back to decaying later to resume the unlock.",
            { symbol }
          )
        : t(
            "Switching to a decaying lock resumes the unlock: the locked amount decays gradually (about 50% every 90 days) and the conviction it carries will decline as it unwinds.",
            { symbol }
          ),
    [symbol, t, targetIsPerpetual]
  )

  return (
    <WizardModalDialog
      title={t("Change lock type")}
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
          <SummaryRow label={t("Hotkey")}>
            <span className="inline-flex max-w-full items-center gap-4 overflow-hidden align-middle">
              <AccountIcon className="shrink-0 text-lg!" address={hotkey} />
              <BittensorValidatorName hotkey={hotkey} className="truncate" />
            </span>
          </SummaryRow>
          <SummaryRow label={t("Locked amount")}>
            <TokensAndFiat
              planck={lockedAmount}
              tokenId={tokenId}
              noCountUp
              tokensClassName="text-body"
              className="text-body-secondary"
            />
          </SummaryRow>
          <SummaryRow label={t("Lock type")}>
            {`${currentIsPerpetual ? t("Perpetual") : t("Decaying")} → ${
              targetIsPerpetual ? t("Perpetual") : t("Decaying")
            }`}
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

        <div className="flex items-start gap-4 rounded bg-alert-warn/10 px-8 py-6 text-alert-warn text-xs">
          <AlertCircleIcon className="mt-0.5 shrink-0 text-sm" />
          <span>{warning}</span>
        </div>
      </ScrollContainer>

      <SapiSendButton
        containerId={BITTENSOR_CHANGE_LOCK_TYPE_MODAL_CONTAINER_ID}
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
