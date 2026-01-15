import { AlertTriangleIcon, CheckIcon, ShieldIcon, XIcon, ZapIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { type FC, useCallback } from "react"
import { useTranslation } from "react-i18next"

import type { PendingAction } from "../types"

interface ActionConfirmationProps {
  action: PendingAction
  onConfirm: () => void
  onCancel: () => void
}

export const ActionConfirmation: FC<ActionConfirmationProps> = ({
  action,
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation()

  const handleConfirm = useCallback(() => {
    onConfirm()
  }, [onConfirm])

  const handleCancel = useCallback(() => {
    onCancel()
  }, [onCancel])

  const isExecuting = action.status === "executing"
  const hasWarnings = action.preview.warnings && action.preview.warnings.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-grey-900 shadow-2xl">
        {/* Header */}
        <div className="border-grey-800/50 border-b bg-grey-800 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#fd4848] to-[#d5ff5c]">
              <ShieldIcon className="h-5 w-5 text-grey-900" />
            </div>
            <div>
              <h2 className="font-semibold text-base text-body">{t("Confirm Transaction")}</h2>
              <p className="text-body-secondary text-xs">
                {t("Review details carefully before proceeding")}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {/* Summary */}
          <div className="mb-6 rounded-xl border border-grey-800 bg-grey-800 p-4">
            <p className="font-medium text-body text-sm leading-relaxed">
              {action.preview.summary}
            </p>
          </div>

          {/* Details */}
          <div className="mb-6">
            <h3 className="mb-3 font-medium text-body-disabled text-xs uppercase tracking-wider">
              {t("Transaction Details")}
            </h3>
            <div className="overflow-hidden rounded-xl border border-grey-800">
              {Object.entries(action.preview.details).map(([key, value], index, arr) => (
                <DetailRow
                  key={key}
                  label={formatLabel(key)}
                  value={formatValue(value)}
                  isLast={index === arr.length - 1}
                />
              ))}
            </div>
          </div>

          {/* Warnings */}
          {hasWarnings && (
            <div className="mb-6 space-y-2">
              {action.preview.warnings?.map((warning, _index) => (
                <div
                  key={warning}
                  className="flex items-start gap-3 rounded-xl border border-[#fd4848]/20 bg-[#fd4848]/5 px-4 py-3"
                >
                  <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#fd4848]" />
                  <span className="text-[#fd4848] text-sm">{warning}</span>
                </div>
              ))}
            </div>
          )}

          {/* Gas Estimate */}
          {action.preview.estimatedGas && (
            <div className="rounded-xl border border-grey-800 bg-grey-800 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-body-secondary">
                  <ZapIcon className="h-4 w-4" />
                  <span className="text-sm">{t("Estimated Fee")}</span>
                </div>
                <span className="font-medium text-body text-sm">{action.preview.estimatedGas}</span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-grey-800/50 border-t bg-grey-800 px-6 py-4">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isExecuting}
            className={classNames(
              "flex flex-1 items-center justify-center gap-2 rounded-xl border border-grey-700 px-4 py-3 font-medium text-sm",
              "text-body transition-colors hover:bg-grey-800",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            <XIcon className="h-4 w-4" />
            {t("Cancel")}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isExecuting}
            className={classNames(
              "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium text-sm",
              "bg-gradient-to-r from-[#fd4848] to-[#d5ff5c] text-grey-900",
              "transition-all hover:opacity-90 hover:shadow-lg",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            {isExecuting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-grey-900 border-t-transparent" />
                {t("Processing...")}
              </>
            ) : (
              <>
                <CheckIcon className="h-4 w-4" />
                {t("Confirm")}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

interface DetailRowProps {
  label: string
  value: string
  isLast?: boolean
}

const DetailRow: FC<DetailRowProps> = ({ label, value, isLast }) => (
  <div
    className={classNames(
      "flex items-center justify-between bg-grey-800 px-4 py-3",
      !isLast && "border-grey-800 border-b"
    )}
  >
    <span className="text-body-secondary text-sm">{label}</span>
    <span className="max-w-[60%] truncate text-right font-medium text-body text-sm">{value}</span>
  </div>
)

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim()
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "-"
  if (typeof value === "object") {
    if (Array.isArray(value)) {
      return value.length > 0 ? `${value.length} items` : "-"
    }
    return JSON.stringify(value)
  }
  return String(value)
}
