import Field from "@talisman/components/Field"
import Grid from "@talisman/components/Grid"
import HeaderBlock from "@talisman/components/HeaderBlock"
import Setting from "@talisman/components/Setting"
import Spacer from "@talisman/components/Spacer"
import { WithTooltip } from "@talisman/components/Tooltip"
import Layout from "@ui/apps/dashboard/layout"
import { AvatarTypeSelect } from "@ui/domains/Settings/AvatarTypeSelect"
import { useAppState } from "@ui/hooks/useAppState"
import { useSetting } from "@ui/hooks/useSettings"

const Options = () => {
  const { hasSpiritKey } = useAppState()
  const [identiconType, setIdenticonType] = useSetting("identiconType")
  const [useTestnets, setUseTestnets] = useSetting("useTestnets")
  const [hideBalances, setHideBalances] = useSetting("hideBalances")
  const [allowNotifications, setAllowNotifications] = useSetting("allowNotifications")
  const [spiritClanFeatures, setSpiritClanFeatures] = useSetting("spiritClanFeatures")

  return (
    <Layout centered withBack backTo="/settings">
      <HeaderBlock title="Extension options" text="Customise your extension experience" />
      <Spacer />
      <Grid columns={1}>
        <Setting title="Enable Testnets" subtitle="Connect to test networks (Westend, Mandala)">
          <Field.Toggle value={useTestnets} onChange={setUseTestnets} />
        </Setting>
        <Setting
          title="Allow notifications"
          subtitle="Allow Talisman to send you notifications about transactions in progress"
        >
          <Field.Toggle value={allowNotifications} onChange={setAllowNotifications} />
        </Setting>
        <Setting title="Hide Balances" subtitle="Blurs your portfolio and account balances">
          <Field.Toggle value={hideBalances} onChange={setHideBalances} />
        </Setting>
        <Setting
          title="Account Avatars"
          subtitle="Choose between the Talisman orbs or Polkadot.js identicons"
        >
          <AvatarTypeSelect selectedType={identiconType} onChange={setIdenticonType} />
        </Setting>
        <Setting
          title="Pre-release features"
          subtitle={
            <>
              <a
                href="https://docs.talisman.xyz/talisman/explore-the-paraverse/talisman-portal/spirit-keys-and-commendations#sprit-keys"
                target="_blank"
                className="text-grey-200 hover:text-body"
              >
                Spirit Key NFT
              </a>{" "}
              holders get special early access to new features
            </>
          }
        >
          <WithTooltip
            tooltip={hasSpiritKey ? undefined : "You need a Spirit Key to enable this option"}
          >
            <Field.Toggle
              disabled={!hasSpiritKey}
              value={hasSpiritKey && spiritClanFeatures}
              onChange={setSpiritClanFeatures}
            />
          </WithTooltip>
        </Setting>
      </Grid>
    </Layout>
  )
}

export default Options
