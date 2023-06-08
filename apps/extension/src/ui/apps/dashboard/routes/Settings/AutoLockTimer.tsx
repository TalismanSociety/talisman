import { SettingsStoreData } from "@core/domains/app/store.settings"
import { Dropdown, DropdownProps } from "@talisman/components/Dropdown"
import HeaderBlock from "@talisman/components/HeaderBlock"
import Layout from "@ui/apps/dashboard/layout"
import { useSetting } from "@ui/hooks/useSettings"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import styled from "styled-components"

type AllowedValues = SettingsStoreData["autoLockTimeout"]
type Option = { value: AllowedValues; label: string }

const PickerItem = styled.div`
  display: flex;
  gap: 1rem;
`

const renderOption = ({ label }: Option) => (
  <PickerItem>
    <span>{label}</span>
  </PickerItem>
)

// this function syntax is required to get around the issue described in Dropdown.tsx and ensure the component is correctly typed
const StyledDropdown = styled((props: DropdownProps<Option>) => Dropdown(props))`
  width: 100%;
  margin-top: 3.2rem;

  label {
    display: flex;
    align-items: center;
    padding-bottom: 1.6rem;
    line-height: 1;
    text-align: left;
    color: var(--color-mid);
  }

  button {
    width: 100%;
  }

  ul {
    top: initial;
  }
`

export const AutoLockTimer = () => {
  const { t } = useTranslation("settings")
  const [autoLockTimeout, setAutoLockTimeout] = useSetting("autoLockTimeout")

  const options: Record<AllowedValues, Option> = useMemo(
    () => ({
      0: { value: 0, label: t("Disabled") },
      300: { value: 300, label: t("5 minutes") },
      1800: { value: 1800, label: t("30 minutes") },
      3600: { value: 3600, label: t("60 minutes") },
    }),
    [t]
  )

  return (
    <Layout centered withBack>
      <HeaderBlock
        title="Auto-lock Timer"
        text="Set a timer to automatically lock the Talisman wallet extension."
      />
      <StyledDropdown
        label="Lock the Talisman extension after inactivity for"
        className="autolock-dropdown"
        renderItem={renderOption}
        propertyKey="value"
        defaultSelectedItem={autoLockTimeout ? options[autoLockTimeout] : options[0]}
        items={Object.values(options)}
        onChange={(val) => {
          const newVal = val?.value || 0
          if (newVal !== autoLockTimeout) setAutoLockTimeout(newVal)
        }}
      />
    </Layout>
  )
}
