import { AccountJsonAny } from "@extension/core"
import { PlusIcon, SecretIcon } from "@talismn/icons"
import useAccounts from "@ui/hooks/useAccounts"
import { useMnemonics } from "@ui/hooks/useMnemonics"
import { FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Dropdown } from "talisman-ui"

export type MnemonicOption = {
  value: string
  label: string
  accounts?: AccountJsonAny[]
}

const GENERATE_MNEMONIC_OPTION = {
  value: "new",
  label: "Generate new recovery phrase",
  accountsCount: undefined,
}

export const AccountAddMnemonicDropdown: FC<{
  label?: string
  value: string | null // null means "generate new"
  onChange: (mnemonicId: string | null) => void
}> = ({ label, value, onChange }) => {
  const { t } = useTranslation("admin")

  const allAccounts = useAccounts()

  const mnemonics = useMnemonics()
  const mnemonicOptions: MnemonicOption[] = useMemo(() => {
    const accountsByMnemonic = allAccounts.reduce((result, acc) => {
      if (!acc.derivedMnemonicId) return result
      if (!result[acc.derivedMnemonicId]) result[acc.derivedMnemonicId] = []
      result[acc.derivedMnemonicId].push(acc)
      return result
    }, {} as Record<string, AccountJsonAny[]>)
    return [
      ...mnemonics
        .map((m) => ({
          label: m.name,
          value: m.id,
          accounts: accountsByMnemonic[m.id] || [],
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      GENERATE_MNEMONIC_OPTION,
    ]
  }, [allAccounts, mnemonics])

  const selected = useMemo(
    () => mnemonicOptions.find((o) => o.value === value) ?? GENERATE_MNEMONIC_OPTION,
    [mnemonicOptions, value]
  )

  const handleChange = useCallback(
    (o: MnemonicOption | null) => {
      if (!o) return // shouldn't happen
      onChange(o.value === "new" ? null : o.value)
    },
    [onChange]
  )

  return (
    <Dropdown
      className="mt-8 [&>label]:mb-4"
      items={mnemonicOptions}
      label={label ?? t("Recovery phrase")}
      propertyKey="value"
      renderItem={(o) => (
        <div className="text-body-secondary flex w-full items-center gap-6 overflow-hidden">
          <div className="bg-body/10 text-md rounded-full p-4">
            {o.value === "new" ? <PlusIcon /> : <SecretIcon />}
          </div>
          <div className="grow truncate text-sm">{o.label}</div>
          {o.value !== "new" && (
            <div className="text-body-disabled flex shrink-0 items-center gap-2 truncate text-xs">
              {t("used by {{count}} accounts", { count: o.accounts?.length ?? 0 })}
            </div>
          )}
        </div>
      )}
      value={selected}
      onChange={handleChange}
      buttonClassName="py-6 bg-field"
      optionClassName="py-4 bg-field"
    />
  )
}
