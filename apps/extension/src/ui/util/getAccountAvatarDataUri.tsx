import { IdenticonType } from "@extension/core"
import Identicon from "@polkadot/react-identicon"
import { isEthereumAddress } from "@polkadot/util-crypto"
import * as Sentry from "@sentry/browser"
import { TalismanOrb } from "@talismn/orb"
import { renderToString } from "react-dom/server"

const generateAccountAvatarDataUri = (address: string, iconType: IdenticonType) => {
  try {
    const component =
      iconType === "polkadot-identicon" ? (
        <Identicon value={address} theme={isEthereumAddress(address) ? "ethereum" : "polkadot"} />
      ) : (
        <TalismanOrb seed={address} />
      )

    const html = renderToString(component)

    // blockies are rendered as img elements with base64 data, return as is
    const rawUri = /<img([^>]*?)src="([^"]*?)"/gi.exec(html)
    if (rawUri) return rawUri[2]

    // lookup svg inside the html, with polkadot identicons it's nested inside divs
    const match = /<svg.*?<\/svg>/gi.exec(html ?? "")
    if (!match) throw new Error("Could not parse SVG")

    let [svg] = match

    // polkadot identicons are rendered in a div and as svg but without xml namespace,
    // resulting data uri will be invalid unless we add it
    if (!svg.includes("xmlns")) svg = svg.replace("<svg", "<svg xmlns='http://www.w3.org/2000/svg'")

    // encode as base64 data uri
    return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`
  } catch (err) {
    Sentry.captureException(err)
    return null
  }
}

const cache: Record<string, string | null> = {}

export const getAccountAvatarDataUri = (
  address: string,
  iconType: IdenticonType = "talisman-orb"
) => {
  const cacheKey = `${address}-${iconType}`
  if (cache[cacheKey] === undefined)
    cache[cacheKey] = generateAccountAvatarDataUri(address, iconType)

  return cache[cacheKey]
}
