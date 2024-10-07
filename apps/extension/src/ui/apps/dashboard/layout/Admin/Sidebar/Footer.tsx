import { HandMonoLogo, TalismanWhiteLogo, TalismanWhiteVerticalLogo } from "@talisman/theme/logos"
import { BuildVersionPill } from "@ui/domains/Build/BuildVersionPill"

export const Footer = () => (
  <footer className="flex w-full items-center justify-center p-8 md:p-12 lg:justify-between">
    <a href="https://talisman.xyz" target="_blank">
      <TalismanWhiteLogo className="hidden h-16 w-auto lg:block" />
      <TalismanWhiteVerticalLogo className="hidden h-[7rem] w-auto md:block lg:hidden" />
      <HandMonoLogo className="h-auto w-full text-white md:hidden" />
    </a>
    <div className="hidden lg:block">
      <BuildVersionPill />
    </div>
  </footer>
)
