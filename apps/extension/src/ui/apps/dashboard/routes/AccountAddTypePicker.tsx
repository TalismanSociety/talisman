import HeaderBlock from "@talisman/components/HeaderBlock"
import Spacer from "@talisman/components/Spacer"
import Grid from "@talisman/components/Grid"
import CtaButton from "@talisman/components/CtaButton"
import Layout from "../layout"
import { KeyIcon, PlusIcon, SeedIcon, UsbIcon } from "@talisman/theme/icons"
import styled from "styled-components"
import { getIsLedgerCapable } from "@core/util/getIsLedgerCapable"

// workaround for plus icon's padding
const LargePlusIcon = styled(PlusIcon)`
  font-size: 2rem;
`

const AccountAddTypePicker = () => {
  const isLedgerCapable = getIsLedgerCapable()

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
          title="Import via Secret Phrase"
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
      </Grid>
    </Layout>
  )
}

export default AccountAddTypePicker
