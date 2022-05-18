import styled from "styled-components"

export const Card = styled(({ className, title, description, cta }) => {
  return (
    <div className={`${className} card-root`}>
      {title && <div className="card-title">{title}</div>}
      {description && <div className="card-description">{description}</div>}
      {cta && <span className="card-cta">{cta}</span>}
    </div>
  )
})`
  background: var(--color-background-muted-3x);
  border-radius: 1.2rem;
  padding: var(--padding);

  > * + * {
    margin-top: 1rem;
  }

  .card-cta > * {
    margin-top: 2rem;
  }
`
