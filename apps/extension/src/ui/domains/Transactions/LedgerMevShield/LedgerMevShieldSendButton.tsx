import {
  type AccountLedgerPolkadot,
  isAccountLedgerPolkadotGeneric,
} from "@core/domains/keyring/exports"
import type { SignerPayloadJSON } from "@core/domains/signing/types"
import type { WalletTransactionInfo } from "@core/domains/transactions/types"
import { ClockIcon } from "@talismn/icons"
import type { ScaleApi } from "@talismn/sapi"
import { Button, type ButtonProps } from "@ui/components/Button"
import { Drawer } from "@ui/components/Drawer"
import { DrawerContent } from "@ui/components/DrawerContent"
import { LedgerConnectionStatus } from "@ui/domains/Account/LedgerConnectionStatus"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import type { PayloadLockListener } from "@ui/hooks/useReportPayloadLock"
import { useAccountByAddress } from "@ui/state/accounts"
import { cn } from "@ui/util/cn"
import { type FC, type ReactNode, useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useUnmount } from "react-use"
import type { Hex } from "viem"
import { SignAlertMessage } from "../../Sign/SignAlertMessage"
import { SignLedgerBase } from "../../Sign/SignLedgerBase"
import { useLockedInputs } from "../useLockedInputs"
import type { LedgerMevShieldStage } from "./ledgerMevShieldReducer"
import { useLedgerMevShield } from "./useLedgerMevShield"

const URGENT_BELOW_SECONDS = 8
const COUNTDOWN_TICK_MS = 200

type LedgerMevShieldSendButtonProps = {
  payload?: SignerPayloadJSON
  txInfo?: WalletTransactionInfo
  containerId?: string
  disabled?: boolean
  className?: string
  color?: ButtonProps["color"]
  onSubmitted: (hash: Hex, innerHash?: Hex) => void
  onError?: (cause: unknown) => void
  onPayloadLockChange?: PayloadLockListener
}

export const LedgerMevShieldSendButton: FC<LedgerMevShieldSendButtonProps> = ({
  payload,
  txInfo,
  onPayloadLockChange,
  ...props
}) => {
  const { lockedInputs, setIsLocked } = useLockedInputs({ payload, txInfo }, onPayloadLockChange)
  const account = useAccountByAddress(lockedInputs.payload?.address)
  const { data: sapi } = useScaleApi(lockedInputs.payload?.genesisHash)

  if (!lockedInputs.payload || !sapi || !isAccountLedgerPolkadotGeneric(account))
    return (
      <SignLedgerBase
        isProcessing={false}
        error={null}
        className={props.className}
        color={props.color}
        disabled
        onSignClick={() => {}}
        onDismissErrorClick={() => {}}
      />
    )

  return (
    <LedgerMevShieldFlow
      {...props}
      payload={lockedInputs.payload}
      txInfo={lockedInputs.txInfo}
      account={account}
      sapi={sapi}
      setIsLocked={setIsLocked}
    />
  )
}

const isSheetOpen = (stage: LedgerMevShieldStage) =>
  stage.kind !== "idle" && stage.kind !== "failed"

const LedgerMevShieldFlow: FC<
  Omit<LedgerMevShieldSendButtonProps, "payload" | "onPayloadLockChange"> & {
    payload: SignerPayloadJSON
    account: AccountLedgerPolkadot
    sapi: ScaleApi
    setIsLocked: (isLocked: boolean) => void
  }
> = ({ containerId, className, color, disabled, setIsLocked, ...props }) => {
  const { t } = useTranslation()
  const { state, start, retry, reset, dismissError } = useLedgerMevShield(props)
  const { stage, deviceBusy } = state

  const [lastOpenStage, setLastOpenStage] = useState(stage)
  if (isSheetOpen(stage) && stage !== lastOpenStage) setLastOpenStage(stage)

  useEffect(() => setIsLocked(stage.kind !== "idle"), [setIsLocked, stage.kind])
  useUnmount(() => setIsLocked(false))

  const handleSignClick = useCallback(() => {
    setIsLocked(true)
    start()
  }, [setIsLocked, start])

  return (
    <div className="flex w-full flex-col gap-4">
      {stage.kind === "idle" &&
        (deviceBusy ? (
          <p className="text-center text-alert-warn text-xs">
            {t("Reject the pending request on your Ledger first.")}
          </p>
        ) : (
          <p className="text-center text-body-secondary text-xs">
            {t("MEV Shield needs two signatures on your Ledger. The second one is time-sensitive.")}
          </p>
        ))}
      <SignLedgerBase
        containerId={containerId}
        className={className}
        color={color}
        disabled={disabled || deviceBusy}
        isProcessing={isSheetOpen(stage)}
        error={stage.kind === "failed" ? stage.error : null}
        onSignClick={handleSignClick}
        onDismissErrorClick={dismissError}
      />
      <Drawer
        analyticsId="ledger_mev_shield"
        anchor="bottom"
        isOpen={isSheetOpen(stage)}
        containerId={containerId}
        onDismiss={stage.kind === "missed" ? reset : undefined}
      >
        <DrawerContent>
          <StagePanel
            stage={lastOpenStage}
            deviceBusy={deviceBusy}
            onRetry={retry}
            onCancel={reset}
          />
        </DrawerContent>
      </Drawer>
    </div>
  )
}

const StagePanel: FC<{
  stage: LedgerMevShieldStage
  deviceBusy: boolean
  onRetry: () => void
  onCancel: () => void
}> = ({ stage, deviceBusy, onRetry, onCancel }) => {
  const { t } = useTranslation()

  switch (stage.kind) {
    case "idle":
    case "failed":
      return null

    case "signingInner":
      return (
        <ApprovalLayout title={t("Approve on your Ledger")}>
          <LedgerConnectionStatus
            status="connecting"
            message={t("Approve your transaction (1 of 2)")}
          />
          <Button fullWidth onClick={onCancel}>
            {t("Cancel")}
          </Button>
        </ApprovalLayout>
      )

    case "awaitingBlock":
      return (
        <ApprovalLayout title={t("Approve on your Ledger")}>
          <LedgerConnectionStatus status="connecting" message={t("Waiting for the next block")} />
          <SignAlertMessage>
            {t(
              "Keep your Ledger unlocked. When the next block arrives, you'll have about 20 seconds to approve the MEV Shield wrapper."
            )}
          </SignAlertMessage>
          <Button fullWidth onClick={onCancel}>
            {t("Cancel")}
          </Button>
        </ApprovalLayout>
      )

    case "signingOuter":
      return (
        <ApprovalLayout title={t("Approve on your Ledger")}>
          <SigningOuterStatus
            key={stage.shieldWindow.deadline}
            deadline={stage.shieldWindow.deadline}
          />
          <SignAlertMessage>
            {t(
              "Your Ledger shows a MevShield call: the encrypted wrapper of your transaction. If the countdown ends first, nothing is sent and you pay no fee."
            )}
          </SignAlertMessage>
          <Button fullWidth onClick={onCancel}>
            {t("Cancel")}
          </Button>
        </ApprovalLayout>
      )

    case "submitting":
      return (
        <ApprovalLayout title={t("Sending your transaction")}>
          <LedgerConnectionStatus
            status="connecting"
            message={t("Sending the MEV Shield wrapper")}
          />
        </ApprovalLayout>
      )

    case "missed":
      return (
        <div className="flex flex-col items-center gap-4">
          <ClockIcon className="text-[1.875rem] text-alert-warn" />
          <div className="mt-4 font-bold text-body">
            {stage.reason === "timeout" ? t("Time ran out") : t("Something went wrong")}
          </div>
          <p className="text-center text-body-secondary text-sm">
            {stage.reason === "timeout"
              ? t(
                  "Nothing was sent and you paid no fee. Your first signature is still valid, so you only need to approve the MEV Shield wrapper again."
                )
              : t(
                  "Your first signature is still valid, so you only need to approve the MEV Shield wrapper again."
                )}
          </p>
          {deviceBusy && (
            <LedgerConnectionStatus
              className="mt-4"
              status="warning"
              message={t("Reject the pending request on your Ledger first.")}
            />
          )}
          <div className="mt-8 grid w-full grid-cols-2 gap-8">
            <Button onClick={onCancel}>{t("Cancel")}</Button>
            <Button primary disabled={deviceBusy} onClick={onRetry}>
              {t("Try again")}
            </Button>
          </div>
        </div>
      )
  }
}

const ApprovalLayout: FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
  <div className="flex flex-col items-center gap-8 text-center">
    <div className="font-bold text-body">{title}</div>
    {children}
  </div>
)

const useNow = (intervalMs: number) => {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(interval)
  }, [intervalMs])
  return now
}

const SigningOuterStatus: FC<{ deadline: number }> = ({ deadline }) => {
  const { t } = useTranslation()
  const [durationMs] = useState(() => deadline - Date.now())
  const remainingMs = Math.max(0, deadline - useNow(COUNTDOWN_TICK_MS))
  const seconds = Math.ceil(remainingMs / 1000)
  const isUrgent = seconds < URGENT_BELOW_SECONDS
  const fraction = durationMs > 0 ? Math.min(1, remainingMs / durationMs) : 0

  return (
    <div className="flex w-full flex-col gap-4">
      <LedgerConnectionStatus status="connecting" message={t("Approve the wrapper (2 of 2)")}>
        <span
          role="timer"
          className={cn(
            "min-w-[3ch] shrink-0 text-right font-bold tabular-nums",
            isUrgent ? "text-alert-error" : "text-alert-warn"
          )}
        >
          {t("{{seconds}}s", { seconds })}
        </span>
      </LedgerConnectionStatus>
      <div className="h-1 w-full overflow-hidden rounded-full bg-grey-800">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-200 ease-linear motion-reduce:transition-none",
            isUrgent ? "bg-alert-error" : "bg-alert-warn"
          )}
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
      <span className="sr-only" aria-live="assertive">
        {isUrgent ? t("Less than {{seconds}} seconds left", { seconds: URGENT_BELOW_SECONDS }) : ""}
      </span>
    </div>
  )
}
