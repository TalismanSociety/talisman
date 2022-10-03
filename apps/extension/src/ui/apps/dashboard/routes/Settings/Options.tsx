import { SettingsStoreData } from "@core/domains/app/store.settings"
import Field from "@talisman/components/Field"
import Grid from "@talisman/components/Grid"
import HeaderBlock from "@talisman/components/HeaderBlock"
import Setting from "@talisman/components/Setting"
import Spacer from "@talisman/components/Spacer"
import Layout from "@ui/apps/dashboard/layout"
import { AvatarTypeSelect } from "@ui/domains/Settings/AvatarTypeSelect"
import { useSettings } from "@ui/hooks/useSettings"
import { useCallback } from "react"

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
    <Layout centered withBack backTo="/settings">
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
