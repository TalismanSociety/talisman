import styled from "styled-components"
import Pill from "@talisman/components/Pill"

interface IProps {
  className?: string
}

const BuildVersion = ({ className }: IProps) => {
  return (
    <Pill className={`${className} build-version`} small primary>
      <span>v{process.env.VERSION}</span>
    </Pill>
  )
}

const StyledBuildVersion = styled(BuildVersion)`
  font-size: var(--font-size-xsmall);
  font-weight: normal;
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-mid);
`

export default StyledBuildVersion
