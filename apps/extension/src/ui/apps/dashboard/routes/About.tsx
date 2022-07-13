import CtaButton from "@talisman/components/CtaButton"
import Grid from "@talisman/components/Grid"
import HeaderBlock from "@talisman/components/HeaderBlock"
import styled from "styled-components"

import Layout from "../layout"

const Description = styled.div`
  text-align: justify;
  font-size: var(--font-size-medium);
  color: var(--color-mid);
  margin: 1.6rem 0 3.2rem;
  border-radius: var(--border-radius);

  a {
    color: var(--color-foreground);
  }
`

const About = () => {
  return (
    <Layout withBack centered>
      <HeaderBlock title="About" />
      <Description>
        <p>
          In the beginning, the paraverse swarmed with formless life and chaotic energy. Travellers
          were lost and confused, enticed by myriad opportunities, but unable to reach their
          destinations. A team of heroic guardians forged the Talisman to help guide their journeys.
        </p>
        <p>
          Created from exotic nanoparticles, and able to safely store the deepest secrets,{" "}
          {/* eslint-disable-next-line react/jsx-no-target-blank */}
          <a href="https://talisman.xyz" target="_blank">
            Talisman
          </a>{" "}
          is here to help you start your paraverse journey.
        </p>
      </Description>
      <Grid columns={1}>
        <CtaButton
          title="Privacy Policy"
          subtitle="Read our Privacy Policy"
          to="https://docs.talisman.xyz/talisman/legal-and-security/privacy-policy"
          external
          allowReferrer
        />
        <CtaButton
          title="Terms of Use"
          subtitle="Read our Terms of Use"
          to="https://docs.talisman.xyz/talisman/legal-and-security/terms-of-use"
          external
          allowReferrer
        />
        <CtaButton
          title="Docs"
          subtitle="Read our developer documentation"
          to="https://docs.talisman.xyz"
          external
          allowReferrer
        />
        <CtaButton
          title="Help and Support"
          subtitle="For help and support please visit our Discord"
          to="https://discord.gg/EF3Zf4R5bD"
          external
        />
      </Grid>
    </Layout>
  )
}

export default About
