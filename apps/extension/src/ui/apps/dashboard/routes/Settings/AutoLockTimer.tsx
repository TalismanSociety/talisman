import { Dropdown, DropdownProps } from "@talisman/components/Dropdown"
import HeaderBlock from "@talisman/components/HeaderBlock"
import Layout from "@ui/apps/dashboard/layout"
import { useSettings } from "@ui/hooks/useSettings"
import styled from "styled-components"

type AllowedValues = 0 | 5 | 30 | 60
type Option = { value: AllowedValues; label: string }

const OPTIONS: Record<AllowedValues, Option> = {
  0: { value: 0, label: "Disabled" },
  5: { value: 5, label: "5 minutes" },
  30: { value: 30, label: "30 minutes" },
  60: { value: 60, label: "60 minutes" },
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
    background-color: var(--color-background-muted);
    border-top-left-radius: var(--border-radius-tiny);
    border-top-right-radius: var(--border-radius-tiny);
    display: flex;
    align-items: center;
    padding: 1.6rem;
    line-height: 1;
    text-align: left;
    color: var(--color-mid);
  }

  button {
    width: 100%;
    border-top-left-radius: 0px;
    border-top-right-radius: 0px;
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
