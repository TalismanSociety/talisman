import { classNames } from "@talismn/util"
import { FC, ReactNode, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"

import { LedgerPolkadotAccountPickerCustom } from "./LedgerPolkadotAccountPickerCustom"
import { LedgerPolkadotAccountPickerDefault } from "./LedgerPolkadotAccountPickerDefault"
import { LedgerPolkadotGenericAccountPickerProps } from "./types"

type DerivationMode = "default" | "custom"

export const LedgerPolkadotAccountPicker: FC<LedgerPolkadotGenericAccountPickerProps> = ({
  onChange,
  app,
  chainId,
}) => {
  const { t } = useTranslation()
  const [mode, setMode] = useState<DerivationMode>("default")

  const handleModeClick = useCallback(
    (newMode: DerivationMode) => () => {
      if (mode === newMode) return
      onChange?.([])
      setMode(newMode)
    },
    [mode, onChange],
  )

  return (
    <div>
      <div className="text-body-secondary mb-8 flex w-full items-center gap-2">
        <div className="grow">{t("Derivation mode:")}</div>
        <div>
          <DerivationModeButton selected={mode === "default"} onClick={handleModeClick("default")}>
            {t("Recommended")}
          </DerivationModeButton>
        </div>
        <div className="text-[0.8em]">|</div>
        <div>
          <DerivationModeButton selected={mode === "custom"} onClick={handleModeClick("custom")}>
            {t("Custom")}
          </DerivationModeButton>
        </div>
      </div>
      {mode === "default" ? (
        <LedgerPolkadotAccountPickerDefault onChange={onChange} app={app} chainId={chainId} />
      ) : (
        <LedgerPolkadotAccountPickerCustom onChange={onChange} app={app} chainId={chainId} />
      )}
    </div>
  )
}

const DerivationModeButton: FC<{ selected: boolean; onClick: () => void; children: ReactNode }> = ({
  selected,
  onClick,
  children,
}) => (
  <button
    type="button"
    className={classNames(selected ? "text-body" : "hover:text-grey-300")}
    onClick={onClick}
  >
    {children}
  </button>
)
