import { IdenticonType } from "@core/types"
import Identicon from "@polkadot/react-identicon"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { TalismanOrb } from "@talisman/components/TalismanOrb"
import * as ReactDOMServer from "react-dom/server"
import * as Sentry from "@sentry/browser"

const generateAccountAvatarDataUri = (address: string, iconType: IdenticonType) => {
  try {
    const component =
      iconType === "polkadot-identicon" ? (
        <Identicon value={address} theme={isEthereumAddress(address) ? "ethereum" : "polkadot"} />
      ) : (
        <TalismanOrb seed={address} />
      )

    const str = ReactDOMServer.renderToString(component)

    // blockies are rendered as img elements with base64 data, return as is
    const rawUri = /<img([^>]*?)src="([^"]*?)"/gi.exec(str)
    if (rawUri) {
      cache[address]
      return rawUri[2]
    }

    // polkadot identicons are rendered in a div and as svg but without namespace, so decoding breaks on the dapp unless we add it
    let [svg] = /<svg.*?<\/svg>/gi.exec(str ?? "")!
    if (!svg.includes("xmlns")) svg = svg.replace("<svg", "<svg xmlns='http://www.w3.org/2000/svg'")

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
