import { SettingsStoreData } from "@core/domains/app/store.settings"
import { Dropdown, DropdownProps } from "@talisman/components/Dropdown"
import HeaderBlock from "@talisman/components/HeaderBlock"
import Layout from "@ui/apps/dashboard/layout"
import { useSettings } from "@ui/hooks/useSettings"
import styled from "styled-components"

type AllowedValues = SettingsStoreData["autoLockTimeout"]
type Option = { value: AllowedValues; label: string }

const OPTIONS: Record<AllowedValues, Option> = {
  0: { value: 0, label: "Disabled" },
  300: { value: 300, label: "5 minutes" },
  1800: { value: 1800, label: "30 minutes" },
  3600: { value: 3600, label: "60 minutes" },
}

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
  const { autoLockTimeout, update } = useSettings()

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
        defaultSelectedItem={autoLockTimeout ? OPTIONS[autoLockTimeout] : OPTIONS[0]}
        items={Object.values(OPTIONS)}
        onChange={(val) => {
          update({ autoLockTimeout: val?.value || 0 })
        }}
      />
    </Layout>
  )
}
