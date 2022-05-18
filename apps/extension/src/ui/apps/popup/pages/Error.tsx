import styled from "styled-components"
import { HandColorLogo } from "@talisman/theme/logos"
import Layout, { Content } from "../Layout"

const Unlock = ({ className }: any) => (
  <Layout className={className}>
    <Content>
      <HandColorLogo className="logo" />
      <h2 data-extended>Error...</h2>
    </Content>
  </Layout>
)

const StyledUnlock = styled(Unlock)`
  .layout-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    .logo {
      font-size: 16rem;
    }

    h2 {
      font-size: var(--font-size-medium);
      font-weight: bold;
      margin-top: 1em;
    }
  }
`

export default StyledUnlock
