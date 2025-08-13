import ReactDOMServer from "react-dom/server"

import { TalismanOrb } from "../components"

/**
 * Returns a base64 encoded data url for the Talisman Orb svg
 */
export const getTalismanOrbDataUrl = (address: string): `data:image/svg+xml;base64,${string}` => {
  // render the TalismanOrb component and output the SVG as text
  const svg = ReactDOMServer.renderToStaticMarkup(<TalismanOrb seed={address} />)

  // convert to data url
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`
}
