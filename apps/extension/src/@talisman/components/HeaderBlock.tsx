import styled from "styled-components"

interface IProps {
  image?: any
  title?: any
  subtitle?: any
  text?: any
  info?: any
  nav?: any[] | any
  large?: boolean
  small?: boolean
  className?: string
}

const HeaderBlock = ({ image, title, subtitle, text, info, nav, className }: IProps) => (
  <header className={`header-block ${className}`}>
    {image && <span className="image">{image}</span>}
    {title && <h1>{title}</h1>}
    {subtitle && <h2 dangerouslySetInnerHTML={{ __html: subtitle }} />}
    {text && <p>{text}</p>}
    {info && <p className="info">{info}</p>}
    {nav && <nav>{nav}</nav>}
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

  > nav {
    margin: 0 auto;
    margin-top: 4.05em;
    text-align: inherit;
    display: flex;
    justify-content: center;
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
