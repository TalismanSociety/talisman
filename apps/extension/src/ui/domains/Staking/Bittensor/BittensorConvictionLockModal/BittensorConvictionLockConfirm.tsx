import type { SignerPayloadJSON } from "@core/domains/signing/types"
import { AlertCircleIcon } from "@talismn/icons"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { StakingFeeEstimate } from "@ui/domains/Staking/shared/StakingFeeEstimate"
import { SapiSendButton } from "@ui/domains/Transactions/SapiSendButton"
import { useAccountByAddress } from "@ui/state/accounts"
import { cn } from "@ui/util/cn"
import { shortenAddress } from "@ui/util/shortenAddress"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { Hex } from "viem"

import { BITTENSOR_LOCK_MODAL_CONTAINER_ID } from "./BittensorConvictionLockContent"

type BittensorConvictionLockConfirmProps = {
  address: string
  hotkey: string
  amount: bigint
  makePerpetual: boolean
  isAlreadyPerpetual: boolean
  isTopUp: boolean
  existingLockAmount: bigint
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
  <div className="flex items-center justify-between gap-8">
    <span className="whitespace-nowrap text-body-secondary">{label}</span>
    <span className="truncate text-body">{children}</span>
  </div>
)

export const BittensorConvictionLockConfirm: FC<BittensorConvictionLockConfirmProps> = ({
  address,
  hotkey,
  amount,
  makePerpetual,
  isAlreadyPerpetual,
  isTopUp,
  existingLockAmount,
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
  const account = useAccountByAddress(address)

  const willBePerpetual = isAlreadyPerpetual || makePerpetual

  const accountLabel = account?.name ?? shortenAddress(address, 6, 6)

  const warning = useMemo(
    () =>
      willBePerpetual
        ? t(
            "This is a perpetual lock: the locked {{symbol}} does not decay and can't be unstaked while perpetual — transferring it hands the lock and its conviction to the recipient. You can switch it to a decaying lock later to resume the unlock.",
            { symbol }
          )
        : t(
            "Locked {{symbol}} can't be unstaked until the lock gradually decays away — transferring it hands the lock and its conviction to the recipient.",
            { symbol }
          ),
    [symbol, t, willBePerpetual]
  )

  return (
    <WizardModalDialog
      title={t("Create conviction lock")}
      contentClassName="size-full flex flex-col overflow-hidden"
      onBackClick={onBack}
      onCloseClick={onClose}
    >
      <ScrollContainer className="grow" innerClassName="flex w-full flex-col gap-8">
        <h2 className="mb-4 text-center font-bold text-md">{t("Review transaction")}</h2>

        <div className="flex flex-col gap-4 rounded bg-grey-900 px-8 py-6 text-sm">
          <SummaryRow label={t("Account")}>{accountLabel}</SummaryRow>
          <SummaryRow label={t("Validator")}>{shortenAddress(hotkey, 6, 6)}</SummaryRow>
          <SummaryRow label={isTopUp ? t("Amount to add") : t("Amount to lock")}>
            <TokensAndFiat
              planck={amount}
              tokenId={tokenId}
              noCountUp
              tokensClassName="text-body"
            />
          </SummaryRow>
          {isTopUp && (
            <SummaryRow label={t("New total locked")}>
              <TokensAndFiat
                planck={existingLockAmount + amount}
                tokenId={tokenId}
                noCountUp
                tokensClassName="text-body"
              />
            </SummaryRow>
          )}
          <SummaryRow label={t("Lock type")}>
            {willBePerpetual ? t("Perpetual") : t("Decaying")}
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
            willBePerpetual
              ? "bg-alert-error/10 text-alert-error"
              : "bg-alert-warn/10 text-alert-warn"
          )}
        >
          <AlertCircleIcon className="mt-0.5 shrink-0 text-sm" />
          <span>{warning}</span>
        </div>
      </ScrollContainer>

      <SapiSendButton
        containerId={BITTENSOR_LOCK_MODAL_CONTAINER_ID}
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
