import HeaderBlock from "@talisman/components/HeaderBlock"
import { ExternalLinkIcon } from "@talisman/theme/icons"
import { CtaButton } from "talisman-ui"

import Layout from "../layout"

const About = () => (
  <Layout withBack centered backTo="/settings">
    <HeaderBlock title="About" />
    <div className="text-body-secondary my-12 flex flex-col gap-8">
      <p>
        In the beginning, the paraverse swarmed with formless life and chaotic energy. Travellers
        were lost and confused, enticed by myriad opportunities, but unable to reach their
        destinations. A team of heroic guardians forged the Talisman to help guide their journeys.
      </p>
      <p>
        Created from exotic nanoparticles, and able to safely store the deepest secrets,{" "}
        <a href="https://talisman.xyz" target="_blank" className="text-grey-200 hover:text-white">
          Talisman
        </a>{" "}
        is here to help you start your paraverse journey.
      </p>
    </div>
    <div className="mt-20 space-y-4">
      <CtaButton
        title="Help and Support"
        subtitle="For help and support please visit our Discord"
        to="https://discord.gg/EF3Zf4R5bD"
        iconRight={ExternalLinkIcon}
      />
      <CtaButton
        title="Docs"
        subtitle="Learn how to use Talisman"
        to="https://docs.talisman.xyz"
        iconRight={ExternalLinkIcon}
      />
      <CtaButton
        title="Changelog"
        subtitle="Review wallet release notes"
        to="https://docs.talisman.xyz/talisman/prepare-for-your-journey/wallet-release-notes"
        iconRight={ExternalLinkIcon}
      />
      <CtaButton
        title="Privacy Policy"
        subtitle="Read our Privacy Policy"
        to="https://docs.talisman.xyz/talisman/legal-and-security/privacy-policy"
        iconRight={ExternalLinkIcon}
      />
      <CtaButton
        title="Terms of Use"
        subtitle="Read our Terms of Use"
        to="https://docs.talisman.xyz/talisman/legal-and-security/terms-of-use"
        iconRight={ExternalLinkIcon}
      />
    </div>
  </Layout>
)

export default About
