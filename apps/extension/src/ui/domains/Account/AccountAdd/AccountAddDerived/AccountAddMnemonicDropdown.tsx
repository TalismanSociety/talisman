import { PlusIcon, SecretIcon } from "@talismn/icons"
import { Account, isAccountOfType } from "extension-core"
import { FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Dropdown } from "talisman-ui"

import { useAccounts, useMnemonics } from "@ui/state"

export type MnemonicOption = {
  value: string
  label: string
  accounts?: Account[]
}

export const AccountAddMnemonicDropdown: FC<{
  label?: string
  value: string | null // null means "generate new"
  onChange: (mnemonicId: string | null) => void
}> = ({ label, value, onChange }) => {
  const { t } = useTranslation()

  const allAccounts = useAccounts()

  const newMmnemonicOption = useMemo(
    () => ({
      value: "new",
      label: t("Generate new recovery phrase"),
      accounts: [],
    }),
    [t],
  )

  const mnemonics = useMnemonics()
  const mnemonicOptions: MnemonicOption[] = useMemo(() => {
    const accountsByMnemonic = allAccounts.reduce(
      (result, acc) => {
        if (!isAccountOfType(acc, "keypair") || !acc.mnemonicId) return result
        if (!result[acc.mnemonicId]) result[acc.mnemonicId] = []
        result[acc.mnemonicId].push(acc)
        return result
      },
      {} as Record<string, Account[]>,
    )
    return [
      ...mnemonics
        .map((m) => ({
          label: m.name,
          value: m.id,
          accounts: accountsByMnemonic[m.id] || [],
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      newMmnemonicOption,
    ]
  }, [allAccounts, mnemonics, newMmnemonicOption])

  const selected = useMemo(
    () => mnemonicOptions.find((o) => o.value === value) ?? newMmnemonicOption,
    [mnemonicOptions, newMmnemonicOption, value],
  )

  const handleChange = useCallback(
    (o: MnemonicOption | null) => {
      if (!o) return // shouldn't happen
      onChange(o.value === "new" ? null : o.value)
    },
    [onChange],
  )

  return (
    <Dropdown
      className="[&>label]:mb-4"
      items={mnemonicOptions}
      label={label ?? t("Recovery phrase")}
      propertyKey="value"
      renderItem={(o) => (
        <div
          className="text-body-secondary flex w-full items-center gap-6 overflow-hidden"
          data-testid="account-add-mnemonic-dropdown"
        >
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
