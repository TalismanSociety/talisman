import Pill from "@talisman/components/Pill"
import { KeyIcon } from "@talisman/theme/icons"
import { useAppState } from "@ui/hooks/useAppState"
import styled from "styled-components"

export interface IProps {
  className?: string
}

const BuildVersion = ({ className }: IProps) => {
  const { hasSpiritKey } = useAppState()

  return (
    <a
      href="https://docs.talisman.xyz/talisman/prepare-for-your-journey/wallet-release-notes"
      target="_blank"
    >
      <Pill className={`${className} build-version`} small primary>
        <span>v{process.env.VERSION}</span>
        {hasSpiritKey && (
          <span className="pb-1">
            <KeyIcon className="text-primary-500 inline-block" />
          </span>
        )}
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
