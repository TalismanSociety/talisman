import styled from "styled-components"
import Button from "@talisman/components/Button"

const AppCta = ({ className }: any) => (
  <article className={`appcta ${className}`}>
    <h1>Explore the Paraverse</h1>
    <p>Connect your wallet to the Talisman Web Application</p>
    <Button small primary>
      Go To App
    </Button>
  </article>
)

export default styled(AppCta)`
  padding: var(--padding);
  width: 100%;
  border-radius: var(--border-radius);
  background: url();
  background-color: purple;
  background-repeat: no-repeat;
  background-position: 50% 50%;
  background-size: cover;

  h1 {
    font-size: var(--font-size-medium);
    margin-bottom: 0.4em;
  }

  p {
    font-size: var(--font-size-small);
  }

  .button {
    width: 100%;
    margin-top: 5rem;
    min-width: auto;
  }
`
