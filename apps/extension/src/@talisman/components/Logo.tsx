import { classNames } from "@talismn/util"
import styled from "styled-components"

import { ReactComponent as Logo } from "../theme/logos/logo-hand-color.svg"

const LogoComponent = ({ className }: { className?: string }) => (
  <Logo className={classNames("logo", className)} />
)

export default styled(LogoComponent)`
  font-size: 1rem;
  width: 14em;
  height: 3.2em;
  max-width: 100%;
`
