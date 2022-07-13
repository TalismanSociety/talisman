import { SettingsStoreData } from "@core/domains/app"
import Field from "@talisman/components/Field"
import Grid from "@talisman/components/Grid"
import HeaderBlock from "@talisman/components/HeaderBlock"
import Setting from "@talisman/components/Setting"
import { SimpleButton } from "@talisman/components/SimpleButton"
import Spacer from "@talisman/components/Spacer"
import Layout from "@ui/apps/dashboard/layout"
import { AvatarTypeSelect } from "@ui/domains/Settings/AvatarTypeSelect"
import { useSettings } from "@ui/hooks/useSettings"
import { useCallback } from "react"
import styled from "styled-components"

const Button = styled(SimpleButton)`
  width: auto;
`

const ModalDescription = styled.p`
  color: var(--color-mid);
  text-align: center;
  font-size: var(--font-size-normal);
  padding: 0.8rem 1.8rem;
`

const CustomNetworksCount = styled.span`
  margin-right: 1.6rem;

  display: flex;
  flex-direction: column;
  align-items: center;

  span {
    display: block;
    width: 2.4rem;
    height: 2.4rem;
    color: var(--color-primary);
    background: rgba(213, 255, 92, 0.12);
    text-align: center;
    border-radius: 50%;
    line-height: 2.4rem;
    padding-top: 0.1rem;
  }
`

const Options = () => {
  const {
    identiconType = "talisman-orb",
    useTestnets = false,
    hideBalances = false,
    allowNotifications = true,
    shouldMimicMetaMask = false,
    update,
  } = useSettings()

  const handleSettingChange = useCallback(
    <K extends keyof SettingsStoreData>(key: K) =>
      (value: SettingsStoreData[K]) => {
        update({ [key]: value })
      },
    [update]
  )

  return (
    <Layout centered withBack>
      <HeaderBlock title="Extension options" text="Customise your extension experience" />
      <Spacer />
      <Grid columns={1}>
        {useTestnets !== undefined && (
          <Setting title="Enable Testnets" subtitle="Connect to test networks (Westend, Mandala)">
            <Field.Toggle value={useTestnets} onChange={handleSettingChange("useTestnets")} />
          </Setting>
        )}
        <Setting
          title="Allow notifications"
          subtitle="Allow Talisman to send you notifications about transactions in progress"
        >
          <Field.Toggle
            value={allowNotifications}
            onChange={handleSettingChange("allowNotifications")}
          />
        </Setting>
        <Setting title="Hide Balances" subtitle="Blurs your portfolio and account balances">
          <Field.Toggle value={hideBalances} onChange={handleSettingChange("hideBalances")} />
        </Setting>
        <Setting
          title="Account Avatars"
          subtitle="Choose between the Talisman orbs or Polkadot.js identicons"
        >
          <AvatarTypeSelect
            selectedType={identiconType}
            onChange={handleSettingChange("identiconType")}
          />
        </Setting>
        <Setting
          title="MetaMask Dapp compatibility"
          subtitle="Allows using Talisman on applications that support MetaMask only. Leave this turned off if you use MetaMask in the same browser as Talisman."
        >
          <Field.Toggle
            value={shouldMimicMetaMask}
            onChange={handleSettingChange("shouldMimicMetaMask")}
          />
        </Setting>
      </Grid>
    </Layout>
  )
}

export default Options
