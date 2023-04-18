import { classNames } from "@talismn/util"
import { ReactNode } from "react"
import styled from "styled-components"

interface IProps {
  title?: ReactNode
  text?: ReactNode
  large?: boolean
  small?: boolean
  className?: string
}

const HeaderBlock = ({ title, text, className }: IProps) => (
  <header className={classNames("header-block", className)}>
    {title && <h1>{title}</h1>}
    {text && <p>{text}</p>}
  </header>
)

const StytledHeaderBlock = styled(HeaderBlock)`
  > .image,
  > h1,
  > h2,
  > p,
  > nav {
    margin: 0;
    white-space: pre-wrap;
  }

  > .image {
    & + h1 {
      margin-top: 1.2em;
    }
  }

  > h1 {
    font-size: var(--font-size-large);

    & + h2 {
      margin-top: 0.67em;
    }
  }

  > h2 {
    font-size: var(--font-size-medium);

    & + p {
      margin-top: 1em;
    }
  }

  > p {
    margin-top: 1em;
    font-size: var(--font-size-normal);
    font-weight: var(--font-weight-light);
    color: var(--color-mid);

    &.info {
      font-size: var(--font-size-small);
      color: var(--color-background-muted-2x);

      > a {
        color: inherit;
        text-decoration: underline;
        opacity: 1;
      }
    }

    & + nav {
      margin-top: 2.05em;
    }
  }

  ${({ large }) =>
    !!large &&
    `
    >h1{ font-size: var(--font-size-xxlarge) }
    >h2{ font-size: var(--font-size-large) }
    >p{ font-size: var(--font-size-medium) }
  `}

  ${({ small }) =>
    !!small &&
    `
    >h1{ font-size: var(--font-size-medium) }
    >h2{ font-size: var(--font-size-normal) }
    >p{ font-size: var(--font-size-small) }
  `}
`

export default StytledHeaderBlock
