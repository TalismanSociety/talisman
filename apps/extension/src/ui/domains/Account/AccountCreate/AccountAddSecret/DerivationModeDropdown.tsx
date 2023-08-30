import { classNames } from "@talismn/util"
import { FC, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Dropdown } from "talisman-ui"

import { AccountAddDerivationMode } from "./context"

type DropdownOption = {
  mode: AccountAddDerivationMode
  label: string
  extra?: string
}

export const DerivationModeDropdown: FC<{
  value: AccountAddDerivationMode
  disabled?: boolean
  className?: string
  onChange: (value: AccountAddDerivationMode) => void
}> = ({ value, disabled, className, onChange }) => {
  const { t } = useTranslation("admin")

  const items = useMemo<DropdownOption[]>(
    () => [
      { mode: "first", label: t("Import first account") },
      { mode: "multi", label: t("Import Multiple Accounts") },
      { mode: "custom", label: t("Custom Derivation Path"), extra: t("Advanced") },
    ],
    [t]
  )

  const [current, setCurrent] = useState<DropdownOption | null>(() => items[0])

  const handleChange = (o: DropdownOption | null) => {
    if (o === null) return // won't happen
    setCurrent(o)
  }

  useEffect(() => {
    setCurrent(items.find((o) => o.mode === value) ?? null)
  }, [items, value])

  useEffect(() => {
    if (current) onChange(current.mode)
  }, [current, onChange])

  return (
    <Dropdown
      items={items}
      propertyKey="mode"
      disabled={disabled}
      onChange={handleChange}
      className={classNames("group", className)}
      buttonClassName="h-28 bg-field px-12 enabled:group-hover:!text-grey-300 disabled:text-body-disabled"
      optionClassName="h-28 bg-field px-12"
      value={current}
      renderItem={(o) => (
        <div className=" flex h-full items-center gap-6 overflow-hidden">
          <div>{o.label}</div>
          <div className="text-body-disabled">{o.extra}</div>
        </div>
      )}
    />
  )
}
