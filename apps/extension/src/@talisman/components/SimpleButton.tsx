import styled from "styled-components"
import { LoaderIcon } from "@talisman/theme/icons"

type ButtonAdditionalProps = {
  primary?: boolean
  inverted?: boolean
  processing?: boolean
}

export const SimpleButton = styled.button.attrs<ButtonAdditionalProps, ButtonAdditionalProps>(
  (props) => ({
    type: props.type || "button",
    primary: props.primary ?? false,
    inverted: props.inverted ?? false,
    processing: props.processing ?? false,
    children: (
      <>
        <span className="btn-content">{props.children}</span>
        {props.processing && (
          <span className="btn-processing">
            <LoaderIcon data-spin />
          </span>
        )}
      </>
    ),
  })
)`
  border: 1px solid var(--color-foreground);
  border-radius: 0.67em;
  padding: 1.2rem;
  position: relative;
  font-size: var(--font-size-normal);
  cursor: pointer;
  transition: all var(--transition-speed) ease-in-out;
  line-height: 1.6em;
  width: 24rem;

  .btn-content {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1em;

    ${({ processing }) => (processing ? `opacity: 0;` : "")}
  }

  // default style
  background: var(--color-background);
  color: var(--color-foreground);
  border: var(--color-foreground);
  border-width: 1px;
  border-style: solid;

  &:hover {
    background: var(--color-foreground);
    color: var(--color-background);
  }

  // primary
  ${({ primary }) =>
    !!primary &&
    `
    background: var(--color-primary);
    color: var(--color-background);
    border: var(--color-primary);

    &:hover{
      filter: brightness(0.8);
      background: var(--color-primary);
      color: var(--color-background);
    }
  `}

  // inverted
  ${({ inverted }) =>
    !!inverted &&
    `
    background: var(--color-foreground);
    color: var(--color-background);
    border: none;
    padding: calc(0.723em + 1px) calc(1em + 1px);
  `}
  
  :disabled {
    filter: saturate(50%);
    opacity: 0.3;
    cursor: not-allowed;
  }

  .btn-processing {
    font-size: 1.4em;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    display: ${({ processing }) => (processing ? "flex" : "none")};
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
`
