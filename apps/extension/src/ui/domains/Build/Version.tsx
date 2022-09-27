import Pill from "@talisman/components/Pill"
import styled from "styled-components"

interface IProps {
  className?: string
}

const BuildVersion = ({ className }: IProps) => {
  return (
    <a
      href="https://docs.talisman.xyz/talisman/prepare-for-your-journey/wallet-release-notes"
      target="_blank"
    >
      <Pill className={`${className} build-version`} small primary>
        <span>v{process.env.VERSION}</span>
      </Pill>
    </a>
  )
}

const StyledBuildVersion = styled(BuildVersion)`
  font-size: var(--font-size-xsmall);
  font-weight: normal;
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-mid);
`

export default StyledBuildVersion
