import styled from "styled-components"
import Link, { ILinkProps } from "./Link"
import { classNames } from "@talisman/util/classNames"
import { ExternalLinkIcon, IconChevron } from "@talisman/theme/icons"

export interface IProps extends ILinkProps {
  title: string
  subtitle?: string
  external?: boolean
}

const CtaButton = ({ icon, title, subtitle, className, external, ...rest }: IProps) => (
  <Link external={external} className={`cta-button ${className}`} {...rest}>
    {icon && <span className="icon">{icon}</span>}
    <span className={classNames("text", !icon && "no-icon")}>
      <div className="title">{title}</div>
      <div className="subtitle">{subtitle}</div>
    </span>
    <span className="arrow">{external ? <ExternalLinkIcon /> : <IconChevron />}</span>
  </Link>
)

export const StyledButton = styled(CtaButton)`
  display: flex;
  justify-self: space-between;
  align-items: center;
  background: var(--color-background-muted);
  border-radius: var(--border-radius);
  text-align: left;

  > span {
    &.icon,
    &.arrow {
      width: 2.4em;
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 0 0.3em;
    }

    &.icon {
      color: var(--color-primary);
      font-size: 1em;
    }

    &.text {
      flex-grow: 1;
      margin: 0;

      .title {
        font-size: var(--font-size-normal);
        line-height: 1.55em;
      }

      .subtitle {
        font-size: var(--font-size-xsmall);
        color: var(--color-mid);
        line-height: 1.55em;
      }
    }
    &.text.no-icon {
      margin-left: 1.6rem;
    }

    &.arrow {
      svg {
        transition: all 0.1s ease-in-out;
        font-size: var(--font-size-large);
        opacity: 0.3;
      }
    }
  }

  ${({ disabled }) =>
    !disabled &&
    `
  &:hover {
    .arrow {
      svg {
        transform: translateX(10%);
        opacity: 0.6;
      }
    }
  }
  `}
`

export default StyledButton
