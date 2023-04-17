import { getIsLedgerCapable } from "@core/util/getIsLedgerCapable"
import CtaButton from "@talisman/components/CtaButton"
import Grid from "@talisman/components/Grid"
import HeaderBlock from "@talisman/components/HeaderBlock"
import Spacer from "@talisman/components/Spacer"
import { KeyIcon, PlusIcon, PolkadotVaultIcon, SeedIcon, UsbIcon } from "@talisman/theme/icons"
import { useAppState } from "@ui/hooks/useAppState"
import { useIsFeatureEnabled } from "@ui/hooks/useFeatures"
import { useSetting } from "@ui/hooks/useSettings"
import styled from "styled-components"

import Layout from "../layout"

// workaround for plus icon's padding
const LargePlusIcon = styled(PlusIcon)`
  font-size: 2rem;
`

const AccountAddTypePicker = () => {
  const isLedgerCapable = getIsLedgerCapable()
  const [hasSpiritKey] = useAppState("hasSpiritKey")
  const [spiritClanFeatures] = useSetting("spiritClanFeatures")
  const paritySignerEnabled =
    useIsFeatureEnabled("PARITY_SIGNER") || (hasSpiritKey && spiritClanFeatures)

  return (
    <Layout centered>
      <HeaderBlock title="Add Account" text="Create a new account or import an existing one" />
      <Spacer />
      <Grid columns={2}>
        <CtaButton
          icon={<LargePlusIcon />}
          title="New Account"
          subtitle="Create a new account"
          to={`/accounts/add/derived`}
        />
        <CtaButton
          icon={<SeedIcon />}
          title="Import via Recovery Phrase"
          subtitle="Your Polkadot or Ethereum account"
          to={`/accounts/add/secret`}
        />
        <CtaButton
          icon={<KeyIcon />}
          title="Import via JSON file"
          subtitle="Import your Polkadot.js account"
          to={`/accounts/add/json`}
        />
        <CtaButton
          icon={<UsbIcon />}
          title="Import from Ledger"
          subtitle={
            "Connect your Ledger wallet" +
            (isLedgerCapable ? "" : " (not supported on this browser)")
          }
          to={`/accounts/add/ledger`}
          disabled={!isLedgerCapable}
        />
        {paritySignerEnabled && (
          <CtaButton
            icon={<PolkadotVaultIcon />}
            title="Import Polkadot Vault"
            subtitle={"Or Parity Signer (Legacy)"}
            to={`/accounts/add/qr`}
          />
        )}
      </Grid>
    </Layout>
  )
}

export default AccountAddTypePicker
