import { scrollbarsStyle } from "@talisman/theme/styles"
import styled from "styled-components"

export const Message = styled.textarea<{ smallText?: boolean }>`
  background-color: var(--color-background-muted-3x);
  color: var(--color-mid);
  flex-grow: 1;
  text-align: left;
  margin: 0;
  padding: 1.2rem;
  border: 0;
  border-radius: var(--border-radius-small);
  margin-top: 0.8rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
    "Courier New", monospace;
  resize: none;

  font-size: ${({ smallText }) => (smallText ? "1.2rem" : "inherit")};
  overflow-x: ${({ smallText }) => (smallText ? "scroll" : "hidden")};
  overflow-wrap: ${({ smallText }) => (smallText ? "normal" : "break-word")};
  white-space: ${({ smallText }) => (smallText ? "pre" : "pre-wrap")};

  ${scrollbarsStyle("var(--color-background-muted-2x)")}
`
