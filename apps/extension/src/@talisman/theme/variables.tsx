// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { createGlobalStyle } from "styled-components"

import { custom, fontSizes, fontWeights, statusColors } from "./definitions"

const Variables = createGlobalStyle`  
  :root {
    /* theme colors as css variables */
    ${({ theme }) =>
      !!theme && Object.keys(theme).map((name) => `--color-${name}: rgb(${theme[name]});`)}
    ${({ theme }) =>
      !!theme && Object.keys(theme).map((name) => `--color-${name}-raw: ${theme[name]};`)}

    /* status color mappings */
    ${Object.keys(statusColors).map((hex) =>
      statusColors[hex].map((status) => `--color-status-${status}: #${hex};`)
    )}

    /* fonts size mappings */
    ${Object.keys(fontSizes).map((name) => `--font-size-${name}: ${fontSizes[name]}rem;`)}

    /* font weights */
    ${Object.keys(fontWeights).map((name) => `--font-weight-${name}: ${fontWeights[name]};`)}

    /* custom  */
    ${Object.keys(custom).map((name) => `--${name}: ${custom[name]};`)}
  }
`

export default Variables
